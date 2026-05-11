/**
 * Per-plan rate-limit configuration.
 *
 * Anonymous session limit (no user) lives in `lib/firebase/sessionService.ts`
 * as `MAX_CREATIONS_PER_DAY = 25` — pre-existing behavior.
 *
 * This module adds per-plan caps that authenticated routes / capabilities
 * can consult. The caps are intentionally soft (request-time enforcement,
 * not provider-side) so they're easy to tune as we learn from the pilot.
 *
 * Why caps on "unlimited" Pro?  Per
 * `docs/infra-cost-and-migration-plan.md`:
 *   Heavy Pro user (30/day) = ~₹1,800/mo cost vs ₹299 revenue = ₹1,500 LOSS.
 *   A soft cap at 50/day caps the worst-case loss without affecting any
 *   realistic kid usage pattern.
 */

export type Plan = 'free' | 'creator' | 'pro' | 'school' | 'admin';

export interface PlanLimits {
  /** Hard cap on creations per UTC day. Server enforces. */
  creationsPerDay: number;
  /** Cooldown between creations, in seconds (anti-spam). */
  cooldownSec: number;
  /** Cost ceiling for the AI router — gates premium providers. */
  maxCostTier: 'free' | 'cheap' | 'standard' | 'premium';
}

const DEFAULTS: Record<Plan, PlanLimits> = {
  free: {
    creationsPerDay: 3,
    cooldownSec: 10,
    maxCostTier: 'cheap',
  },
  creator: {
    creationsPerDay: 15,
    cooldownSec: 5,
    maxCostTier: 'standard',
  },
  pro: {
    // Soft cap at 50/day — generous for any real kid (3-creations/day is the
    // 95th percentile per the cost plan), bounded enough that the worst-case
    // loss stays predictable.
    creationsPerDay: 50,
    cooldownSec: 5,
    maxCostTier: 'premium',
  },
  school: {
    // Per-student soft cap.
    creationsPerDay: 10,
    cooldownSec: 5,
    maxCostTier: 'standard',
  },
  admin: {
    creationsPerDay: 1_000,
    cooldownSec: 0,
    maxCostTier: 'premium',
  },
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
