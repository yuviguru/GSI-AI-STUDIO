/**
 * `assertEntitled` — the one choke point every AI API route calls before
 * invoking a model.
 *
 * Usage:
 *
 *   // app/api/ai/story/route.ts
 *   import { assertEntitled } from '@/lib/billing';
 *
 *   export async function POST(req: Request) {
 *     const authCtx = await verifyAuth(req);
 *     await assertEntitled(authCtx, { feature: 'story.generate' });
 *     // ... call the model ...
 *   }
 *
 *   // For capability gates with no credit cost:
 *   await assertEntitled(authCtx, { capability: 'canExportPdf' });
 *
 *   // For routes that gate AND consume credits (typical):
 *   await assertEntitled(authCtx, { feature: 'image.sdxl', capability: 'priorityImageGen' });
 *
 * Order of checks (each can short-circuit):
 *   1. shouldBypass(kidId)  — dev only, returns silently
 *   2. capability check     — throws PlanError if plan lacks capability
 *   3. credit cost lookup   — throws InsufficientCreditsError on empty wallet
 *   4. atomic debit         — credits debited + ledger entry written in one tx
 *
 * The guard NEVER:
 *   - Touches the model (provider clients are called by the route, not here).
 *   - Refunds on downstream failure — that's the route's job (call
 *     `refundFailedDebit` if the model call throws).
 *
 * Error mapping for routes: catch + convert to API error response:
 *
 *   try { await assertEntitled(...) }
 *   catch (e) {
 *     if (e instanceof PlanError) return apiError(403, 'FORBIDDEN_BY_PLAN', e.message, e.details);
 *     if (e instanceof InsufficientCreditsError) return apiError(402, 'INSUFFICIENT_CREDITS', e.message, { required: e.required, available: e.available });
 *     throw e;
 *   }
 */

import type { AuthContext, UserPlan } from '@gsi/types';
import { ENTITLEMENTS, hasEntitlement, type PlanEntitlements } from './entitlements';
import { getCost } from './creditCosts';
import { debitCredits, InsufficientCreditsError } from './credits';
import { shouldBypass } from './bypass';

export { InsufficientCreditsError };

/**
 * Thrown when the caller's plan lacks a required capability. Distinct from
 * `InsufficientCreditsError` so routes can show different UI (upgrade CTA
 * vs. topup CTA).
 */
export class PlanError extends Error {
  readonly code = 'FORBIDDEN_BY_PLAN';
  readonly status = 403;
  readonly currentPlan: UserPlan;
  readonly capability: keyof PlanEntitlements;
  constructor(args: { currentPlan: UserPlan; capability: keyof PlanEntitlements }) {
    super(`Plan '${args.currentPlan}' does not include capability '${args.capability}'.`);
    this.currentPlan = args.currentPlan;
    this.capability = args.capability;
  }
}

/**
 * Suggest the lowest plan that unlocks `capability`. Used to render the
 * upgrade CTA in error responses ("Pro" instead of just "a higher tier").
 *
 * Reads from `ENTITLEMENTS` — when entitlements change, this stays correct
 * automatically. Order matches the `PLAN_IDS` display order; `admin` is
 * excluded because we never recommend it as an upgrade target.
 */
function suggestUpgrade(capability: keyof PlanEntitlements): UserPlan | null {
  const order: UserPlan[] = ['free', 'creator', 'pro', 'school'];
  for (const plan of order) {
    const value = ENTITLEMENTS[plan][capability];
    const enabled = typeof value === 'number' ? value > 0 : Boolean(value);
    if (enabled) return plan;
  }
  return null;
}

export interface AssertEntitledOptions {
  /** Charge credits using `CREDIT_COSTS[feature]`. Omit for free actions. */
  feature?: string;
  /** Require a specific capability from `ENTITLEMENTS`. Omit if not gated. */
  capability?: keyof PlanEntitlements;
  /** Tag the ledger entry with extra analytics. */
  metadata?: Record<string, unknown>;
}

export interface AssertEntitledResult {
  /** True if the bypass short-circuited everything. */
  bypassed: boolean;
  /** Credit cost charged. 0 if free or bypassed. */
  charged: number;
  /** Balance after debit. `null` if bypassed or no kidId. */
  balanceAfter: number | null;
  /** Ledger entry ID. Empty string if no debit happened. */
  entryId: string;
}

/**
 * Lightweight context the guard needs. Strictly a subset of `AuthContext`
 * but expressed as a free-standing type so callers can pass synthetic
 * contexts (e.g. cron jobs, admin tools) that don't construct a full auth
 * record. Every field is optional — anonymous flows pass `{}` and the
 * guard treats them as `plan: 'free'` with no debit.
 */
export interface BillingContext {
  kidId?: string;
  plan?: UserPlan;
  role?: AuthContext['role'];
}

/**
 * Enforce plan + credit guards. See module docstring for usage.
 *
 * Anonymous callers (no kidId) skip the credit check — they're already
 * gated by the anonymous-session rate limit in `sessionService.ts`.
 * Capability gates still apply (the answer is "no, you need an account").
 */
export async function assertEntitled(
  ctx: BillingContext,
  options: AssertEntitledOptions,
): Promise<AssertEntitledResult> {
  const plan: UserPlan = ctx.plan ?? 'free';

  // 1. Dev bypass — returns early before any reads.
  if (shouldBypass(ctx.kidId)) {
    return { bypassed: true, charged: 0, balanceAfter: null, entryId: '' };
  }

  // Admin role is implicitly unmetered. Distinct from BILLING_BYPASS so
  // production admin accounts work without env flags.
  if (plan === 'admin') {
    return { bypassed: true, charged: 0, balanceAfter: null, entryId: '' };
  }

  // 2. Capability gate.
  if (options.capability) {
    if (!hasEntitlement(plan, options.capability)) {
      throw new PlanError({ currentPlan: plan, capability: options.capability });
    }
  }

  // 3. Credit debit (skip if no feature OR no kidId — anonymous or
  // capability-only checks both fall through cleanly).
  const cost = getCost(options.feature);
  if (cost === 0 || !ctx.kidId) {
    return { bypassed: false, charged: 0, balanceAfter: null, entryId: '' };
  }

  const result = await debitCredits({
    kidId: ctx.kidId,
    amount: cost,
    feature: options.feature!,
    metadata: { plan, role: ctx.role, ...options.metadata },
  });

  return {
    bypassed: false,
    charged: cost,
    balanceAfter: result.balanceAfter,
    entryId: result.entryId,
  };
}

/**
 * Helper to attach upgrade context to a `PlanError` for the API response.
 * Returns the JSON-ready `details` shape documented in api-contracts.md.
 */
export function planErrorDetails(err: PlanError): {
  currentPlan: UserPlan;
  requiredPlan: UserPlan | null;
  feature: string;
  upgradeUrl: string;
} {
  const requiredPlan = suggestUpgrade(err.capability);
  return {
    currentPlan: err.currentPlan,
    requiredPlan,
    feature: err.capability,
    upgradeUrl: requiredPlan ? `/billing/upgrade?to=${requiredPlan}` : '/billing/upgrade',
  };
}

/**
 * Helper to attach topup context to an `InsufficientCreditsError`.
 */
export function insufficientCreditsDetails(err: InsufficientCreditsError): {
  required: number;
  available: number;
  feature?: string;
  topupUrl: string;
} {
  // Suggest a topup that comfortably covers this debit. Round up to the
  // next bundle (100 / 500 / 2000) so the kid can keep going.
  const bundles = [100, 500, 2000];
  const suggested = bundles.find((b) => b >= err.required - err.available) ?? bundles.at(-1)!;
  return {
    required: err.required,
    available: err.available,
    feature: err.feature,
    topupUrl: `/billing/topup?suggested=${suggested}`,
  };
}
