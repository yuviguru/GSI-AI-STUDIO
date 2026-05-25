/**
 * Per-plan rate-limit configuration.
 *
 * Anonymous session limit (no user) lives in `lib/firebase/sessionService.ts`
 * as `MAX_CREATIONS_PER_DAY = 25` — pre-existing behavior.
 *
 * **Now a thin adapter** over `lib/billing/` (BILLING-001). Public API
 * (`Plan`, `PlanLimits`, `getPlanLimits`) is preserved for backward
 * compatibility — callers don't need to migrate. New code should prefer
 * `assertEntitled` from `@/lib/billing` directly, which gives finer-grained
 * per-feature credit accounting instead of a single creations-per-day cap.
 *
 * The `creationsPerDay` cap is a hard ceiling that complements the per-call
 * credit debit — it stops a runaway loop from burning a full month's
 * credit grant in 30 seconds even though the wallet would technically
 * cover it.
 */

import type { UserPlan } from '@gsi/types';

export type Plan = UserPlan;

export interface PlanLimits {
  /** Hard cap on creations per UTC day. Server enforces. */
  creationsPerDay: number;
  /** Cooldown between creations, in seconds (anti-spam). */
  cooldownSec: number;
  /** Cost ceiling for the AI router — gates premium providers. */
  maxCostTier: 'free' | 'cheap' | 'standard' | 'premium';
}

/**
 * Defaults — kept in lockstep with `lib/billing/plans.ts` so the day-cap
 * stays plausible for each tier's credit budget. The numbers are intentionally
 * "soft caps" (request-time, not provider-side) to be tunable per-pilot via
 * env overrides.
 *
 * Why caps on "unlimited" Pro? See `docs/infra-cost-and-migration-plan.md`:
 * a 30-creations/day user costs more than the Pro plan price. 50/day is the
 * worst-case-loss ceiling that still leaves no realistic kid hitting it.
 */
const DEFAULTS: Record<Plan, PlanLimits> = {
  free: { creationsPerDay: 3, cooldownSec: 10, maxCostTier: 'cheap' },
  creator: { creationsPerDay: 15, cooldownSec: 5, maxCostTier: 'standard' },
  pro: { creationsPerDay: 50, cooldownSec: 5, maxCostTier: 'premium' },
  school: { creationsPerDay: 10, cooldownSec: 5, maxCostTier: 'standard' },
  admin: { creationsPerDay: 1_000, cooldownSec: 0, maxCostTier: 'premium' },
};

/**
 * Resolve effective limits for a plan. Env overrides allow the team to tune
 * a single tier without a code change:
 *   PLAN_LIMITS_PRO_DAY=75 PLAN_LIMITS_PRO_TIER=premium
 */
export function getPlanLimits(plan: Plan | string | undefined): PlanLimits {
  const key = (plan ?? 'free').toLowerCase() as Plan;
  const base = DEFAULTS[key] ?? DEFAULTS.free;
  const upper = key.toUpperCase();
  const dayOverride = process.env[`PLAN_LIMITS_${upper}_DAY`];
  const cdOverride = process.env[`PLAN_LIMITS_${upper}_COOLDOWN`];
  const tierOverride = process.env[`PLAN_LIMITS_${upper}_TIER`] as
    | PlanLimits['maxCostTier']
    | undefined;
  return {
    creationsPerDay: dayOverride ? Number(dayOverride) : base.creationsPerDay,
    cooldownSec: cdOverride ? Number(cdOverride) : base.cooldownSec,
    maxCostTier: tierOverride ?? base.maxCostTier,
  };
}
