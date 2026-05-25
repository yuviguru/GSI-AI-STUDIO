/**
 * Glue between the billing guard and the existing API error pipeline.
 *
 * Routes should:
 *   ```
 *   try {
 *     const billingCtx = await resolveBillingContext(request);
 *     await assertEntitled(billingCtx, { feature: 'story.generate' });
 *     // ... model call ...
 *   } catch (err) {
 *     throw toAppException(err);  // converts billing errors; rethrows others
 *   }
 *   ```
 *
 * `toAppException` is idempotent on already-mapped errors so chaining
 * helpers that re-throw is safe.
 */

import type { NextRequest } from 'next/server';
import { AppException } from '@/lib/api-utils';
import { hybridAuth } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
import {
  PlanError,
  InsufficientCreditsError,
  planErrorDetails,
  insufficientCreditsDetails,
  type BillingContext,
} from './guard';

/**
 * Build a `BillingContext` from the request.
 *
 * Auth modes:
 *   - Authenticated parent + `X-Active-Kid-Id` header → full ctx with kidId
 *     and the kid's effective plan (looked up from the kid doc; falls back
 *     to the parent's plan, falls back to 'free').
 *   - Authenticated parent, no kid header → no kidId, plan from user doc.
 *   - Anonymous session (X-Session-Id) → empty ctx (plan='free', no kidId).
 *     Anonymous callers are exempt from credit debits — they're already
 *     gated by the per-session creation cap in `sessionService`.
 *
 * Never throws — returns a sensible default rather than blocking the
 * route. Hard-auth checks should still happen elsewhere (e.g. `verifyAuth`
 * for routes that require sign-in).
 */
export async function resolveBillingContext(request: NextRequest): Promise<BillingContext> {
  // Best-effort hybridAuth. If it throws (no auth headers at all), fall
  // back to anonymous defaults — billing isn't the gatekeeper for auth.
  let authResult;
  try {
    authResult = await hybridAuth(request);
  } catch {
    return {};
  }

  if (authResult.type === 'anonymous') {
    return {};
  }

  const { auth } = authResult;
  const kidIdHeader = request.headers.get('X-Active-Kid-Id') ?? undefined;

  if (!kidIdHeader) {
    return { plan: auth.plan, role: auth.role };
  }

  // Resolve the kid's effective plan. Kid docs cache `plan` for fast
  // guard reads (BILLING-001 schema); fall back to the parent's plan if
  // the kid doc is missing the field (pre-migration kids).
  try {
    const kidSnap = await adminDb.collection('kids').doc(kidIdHeader).get();
    const kidPlan = kidSnap.exists ? (kidSnap.data()?.plan as BillingContext['plan']) : undefined;
    return {
      kidId: kidIdHeader,
      plan: kidPlan ?? auth.plan,
      role: auth.role,
    };
  } catch {
    // Firestore unreachable or kid doc malformed — default to the parent's
    // plan, no debit. The credit ledger writes will fail downstream if
    // the kid doc truly doesn't exist, which is the right behavior.
    return {
      kidId: kidIdHeader,
      plan: auth.plan,
      role: auth.role,
    };
  }
}

/**
 * Convert billing errors to `AppException` with the documented `details`
 * shape (see `docs/api-contracts.md#plancredit-error-response-shape`).
 *
 * - `PlanError`         → 403 FORBIDDEN_BY_PLAN with `{currentPlan, requiredPlan, feature, upgradeUrl}`
 * - `InsufficientCreditsError` → 402 INSUFFICIENT_CREDITS with `{required, available, feature, topupUrl}`
 *
 * Other errors pass through unchanged so the existing `handleApiError`
 * pipeline catches them as 500s (or whatever the original AppException
 * specified).
 */
export function toAppException(err: unknown): unknown {
  if (err instanceof PlanError) {
    const details = planErrorDetails(err);
    return new AppException('FORBIDDEN_BY_PLAN', err.message, 403, details);
  }
  if (err instanceof InsufficientCreditsError) {
    const details = insufficientCreditsDetails(err);
    return new AppException('INSUFFICIENT_CREDITS', err.message, 402, details);
  }
  return err;
}

/**
 * Convenience: catch-and-rethrow wrapper for routes. Use inside route
 * handlers when you want a tighter try/catch around the billing call:
 *
 *   await withBillingErrors(async () => {
 *     await assertEntitled(ctx, { feature: 'story.generate' });
 *     return await createStory(input);
 *   });
 *
 * Anything inside that throws a `PlanError` or `InsufficientCreditsError`
 * gets converted to `AppException`; everything else flows through.
 */
export async function withBillingErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toAppException(err);
  }
}
