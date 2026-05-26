/**
 * Glue between the billing guard and the API error pipeline.
 *
 * Routes normally use the all-in-one `enforceBilling(request, options)` —
 * it resolves the billing context, runs the guard, and maps any thrown
 * billing error into an `AppException` that flows through the existing
 * `handleApiError`. The lower-level pieces are exported for callers that
 * need finer control (e.g. attaching a refund on downstream failure).
 */

import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { AppException } from '@/lib/api-utils';
import { hybridAuth } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
import { ipFromRequest } from '@/lib/api/requestUtils';
import { getCost } from './creditCosts';
import { debitDeviceCredits } from './deviceCredits';
import { shouldBypass } from './bypass';
import {
  assertEntitled,
  PlanError,
  planErrorDetails,
  insufficientCreditsDetails,
  type AssertEntitledOptions,
  type AssertEntitledResult,
  type BillingContext,
} from './guard';
import { InsufficientCreditsError } from './credits';

function hashIpSha256(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Build a `BillingContext` from the request.
 *
 * - Authenticated parent + `X-Active-Kid-Id` → ctx with kidId and the
 *   kid's plan (looked up from the kid doc; falls back to parent's plan).
 * - Authenticated parent, no kid header → ctx with plan from user doc.
 * - Anonymous session (X-Session-Id) → empty ctx (no kidId → no debit).
 *
 * Never throws — returns a sensible default. Hard-auth checks belong
 * elsewhere (`verifyAuth` for sign-in-required routes).
 */
export async function resolveBillingContext(request: NextRequest): Promise<BillingContext> {
  let authResult;
  try {
    authResult = await hybridAuth(request);
  } catch {
    return {};
  }
  if (authResult.type === 'anonymous') return {};

  const { auth } = authResult;
  const kidId = request.headers.get('X-Active-Kid-Id') ?? undefined;
  if (!kidId) return { plan: auth.plan, role: auth.role };

  try {
    const snap = await adminDb.collection('kids').doc(kidId).get();
    const kidPlan = snap.exists ? (snap.data()?.plan as BillingContext['plan']) : undefined;
    return { kidId, plan: kidPlan ?? auth.plan, role: auth.role };
  } catch {
    // Firestore unreachable — fall back to the parent's plan. The actual
    // debit (if any) will fail downstream with a proper error.
    return { kidId, plan: auth.plan, role: auth.role };
  }
}

/**
 * Convert billing errors to `AppException` with the documented
 * `error.details` shape. Other errors pass through unchanged so the
 * existing `handleApiError` pipeline catches them as 500s.
 */
export function toAppException(err: unknown): unknown {
  if (err instanceof PlanError) {
    return new AppException('FORBIDDEN_BY_PLAN', err.message, 403, planErrorDetails(err));
  }
  if (err instanceof InsufficientCreditsError) {
    return new AppException(
      'INSUFFICIENT_CREDITS',
      err.message,
      402,
      insufficientCreditsDetails(err),
    );
  }
  return err;
}

/**
 * All-in-one: resolve context, run guard, map errors. The one call AI
 * routes need.
 *
 *   await enforceBilling(request, { feature: 'story.generate' });
 *
 * For authed callers with an active kid, debits the kid wallet via
 * `assertEntitled`. For anonymous callers, debits the device-bound
 * trial wallet (`deviceCredits/{ipHash}`) so trial usage is capped
 * even after a localStorage wipe — BILLING-001 anti-abuse measure.
 */
export async function enforceBilling(
  request: NextRequest,
  options: AssertEntitledOptions,
): Promise<AssertEntitledResult> {
  const ctx = await resolveBillingContext(request);

  // Authed path — kid wallet (or admin / bypass short-circuit inside the guard).
  if (ctx.kidId) {
    try {
      return await assertEntitled(ctx, options);
    } catch (err) {
      throw toAppException(err);
    }
  }

  // Capability-only checks for non-kid callers still go through the
  // guard (it'll throw PlanError if the caller's plan lacks the cap).
  if (options.capability) {
    try {
      return await assertEntitled(ctx, options);
    } catch (err) {
      throw toAppException(err);
    }
  }

  // Anonymous + feature has a cost → debit the device trial wallet.
  // Dev-bypass mirrors the per-kid path so feature work isn't blocked
  // when running locally.
  const cost = getCost(options.feature);
  if (cost === 0 || shouldBypass(undefined)) {
    return { bypassed: shouldBypass(undefined), charged: 0, balanceAfter: null, entryId: '' };
  }

  const ip = ipFromRequest(request);
  if (!ip) {
    // No way to attribute usage to a device (local dev / missing
    // header). Let it through — anonymous-session creation caps in
    // `enforceIpRateLimit` already protect this case.
    return { bypassed: false, charged: 0, balanceAfter: null, entryId: '' };
  }

  const ipHash = hashIpSha256(ip);
  try {
    const result = await debitDeviceCredits({
      ipHash,
      amount: cost,
      feature: options.feature!,
    });
    return {
      bypassed: false,
      charged: cost,
      balanceAfter: result.balanceAfter,
      entryId: '', // device debits don't write a per-kid ledger entry
    };
  } catch (err) {
    throw toAppException(err);
  }
}
