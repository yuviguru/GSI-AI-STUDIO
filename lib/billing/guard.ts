/**
 * `assertEntitled` — the one choke point every AI API route calls before
 * invoking a model.
 *
 * Order of checks (each can short-circuit):
 *   1. dev bypass         (BILLING_BYPASS env vars)
 *   2. admin plan         (implicitly unmetered)
 *   3. capability gate    → throws PlanError on miss
 *   4. credit cost lookup → debit + ledger entry in one tx
 *
 * Anonymous callers (no kidId) skip the debit — they're already gated by
 * the per-session creation cap. Capability gates still apply.
 */

import type { AuthContext, UserPlan } from '@gsi/types';
import { ENTITLEMENTS, hasEntitlement, type PlanEntitlements } from './entitlements';
import { getCost } from './creditCosts';
import { debitCredits, InsufficientCreditsError } from './credits';
import { shouldBypass } from './bypass';
import { PLAN_IDS } from './plans';
import { listTopups } from './razorpay/topupCatalog';

// Thrown when a plan lacks a required capability. Distinct from
// `InsufficientCreditsError` so routes can render different UI (upgrade vs.
// topup CTA).
export class PlanError extends Error {
  readonly code = 'FORBIDDEN_BY_PLAN';
  readonly status = 403;
  constructor(
    readonly currentPlan: UserPlan,
    readonly capability: keyof PlanEntitlements,
  ) {
    super(`Plan '${currentPlan}' does not include capability '${capability}'.`);
  }
}

/**
 * Lightweight context the guard needs. A subset of `AuthContext` expressed
 * as its own type so cron jobs and admin tools can pass synthetic contexts.
 * All fields optional — anonymous flows pass `{}`.
 */
export interface BillingContext {
  kidId?: string;
  plan?: UserPlan;
  role?: AuthContext['role'];
}

export interface AssertEntitledOptions {
  /** Charge credits via `CREDIT_COSTS[feature]`. Omit for free actions. */
  feature?: string;
  /** Gate on a capability from `ENTITLEMENTS`. Omit if not gated. */
  capability?: keyof PlanEntitlements;
  /** Extra metadata stamped on the ledger entry. */
  metadata?: Record<string, unknown>;
}

export interface AssertEntitledResult {
  bypassed: boolean;
  charged: number;
  /** Balance after debit. `null` if bypassed, free, or anonymous. */
  balanceAfter: number | null;
  entryId: string;
}

export async function assertEntitled(
  ctx: BillingContext,
  options: AssertEntitledOptions,
): Promise<AssertEntitledResult> {
  const plan: UserPlan = ctx.plan ?? 'free';

  if (shouldBypass(ctx.kidId) || plan === 'admin') {
    return { bypassed: true, charged: 0, balanceAfter: null, entryId: '' };
  }

  if (options.capability && !hasEntitlement(plan, options.capability)) {
    throw new PlanError(plan, options.capability);
  }

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

// ─── Error-detail builders for API responses ────────────────────────────

/**
 * Lowest plan that unlocks `capability`. Iterates `PLAN_IDS` so adding a
 * tier flows through automatically. Admin is excluded — never recommend it
 * as an upgrade target.
 */
function suggestUpgrade(capability: keyof PlanEntitlements): UserPlan | null {
  for (const plan of PLAN_IDS) {
    if (plan === 'admin') continue;
    const value = ENTITLEMENTS[plan][capability];
    const enabled = typeof value === 'number' ? value > 0 : Boolean(value);
    if (enabled) return plan;
  }
  return null;
}

/** Shape documented in `docs/api-contracts.md#plancredit-error-response-shape`. */
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

export function insufficientCreditsDetails(err: InsufficientCreditsError): {
  required: number;
  available: number;
  feature?: string;
  topupUrl: string;
} {
  // Pick the smallest topup bundle that covers the shortfall.
  const shortfall = err.required - err.available;
  const bundles = listTopups()
    .map((b) => b.credits)
    .sort((a, b) => a - b);
  const suggested = bundles.find((c) => c >= shortfall) ?? bundles.at(-1) ?? 0;
  return {
    required: err.required,
    available: err.available,
    feature: err.feature,
    topupUrl: `/billing/topup?suggested=${suggested}`,
  };
}

// Re-export so consumers can `import { ... } from '@/lib/billing'`. The
// error itself is owned by `./credits`.
export { InsufficientCreditsError } from './credits';
