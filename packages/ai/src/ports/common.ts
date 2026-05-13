/**
 * Common types shared across all AI provider ports.
 */

export type CostTier = 'free' | 'cheap' | 'standard' | 'premium';

export const COST_TIER_RANK: Record<CostTier, number> = {
  free: 0,
  cheap: 1,
  standard: 2,
  premium: 3,
};

/** Returns true when `tier` is at or below the `ceiling`. */
export function tierAtMost(tier: CostTier, ceiling: CostTier): boolean {
  return COST_TIER_RANK[tier] <= COST_TIER_RANK[ceiling];
}

/**
 * Cached health snapshot for a single provider. Routers consult this on
 * every request — must be cheap (Map lookup, no network).
 */
export interface HealthStatus {
  healthy: boolean;
  /** Epoch ms of the last probe. */
  checkedAt: number;
  /** Round-trip latency from the last successful probe. */
  latencyMs?: number;
  /** Human-readable reason when unhealthy. */
  reason?: string;
  /** Set when the provider returned 429 or equivalent. */
  rateLimited?: boolean;
  /** When the provider says we may try again (epoch ms). */
  retryAfterMs?: number;
}

export interface ProviderMeta {
  /** Stable identifier — used in logs, metrics, and the env-driven order list. */
  name: string;
  /** Lower number = higher priority in router selection. */
  priority: number;
  costTier: CostTier;
}
