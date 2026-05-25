/**
 * Glue between the billing guard and the API error pipeline.
 *
 * Routes normally use the all-in-one `enforceBilling(request, options)` —
 * it resolves the billing context, runs the guard, and maps any thrown
 * billing error into an `AppException` that flows through the existing
 * `handleApiError`. The lower-level pieces are exported for callers that
 * need finer control (e.g. attaching a refund on downstream failure).
 */

import type { NextRequest } from 'next/server';
import { AppException } from '@/lib/api-utils';
import { hybridAuth } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
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
 * For routes that need the result (charged amount, balance after, etc.),
 * the call returns the `AssertEntitledResult`.
 */
export async function enforceBilling(
  request: NextRequest,
  options: AssertEntitledOptions,
): Promise<AssertEntitledResult> {
  const ctx = await resolveBillingContext(request);
  try {
    return await assertEntitled(ctx, options);
  } catch (err) {
    throw toAppException(err);
  }
}
