/** Kid CEO profile/dimension math — ported from
 *  SimPrenuer/backend/profileEngine.js (`applyScoreAdjustments`, lines 283-294).
 *
 *  SimPrenuer stored a flat profile `{ risk_calibration, capital_discipline,
 *  …, total_decisions }`. Kid CEO expands each dimension into a richer
 *  `CeoDimensionData = { score, decisions, trend }` so the UI can render
 *  per-dimension trend arrows and decision counts on the DNA Card.
 *
 *  All 6 dimensions start at 50 (neutral baseline, matching SimPrenuer's
 *  `|| 50` defaults). Scores clamp to [0, 100] on every update.
 *
 *  Pure math only — no Firebase, no async, no mutation.
 */

import type {
  CeoDimensionData,
  CeoDimensionKey,
  CeoDimensionScores,
  CeoProfile,
} from '@gsi/types';
import { DIMENSIONS } from './constants';

const BASELINE_SCORE = 50;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Initial dimension scores — all 6 start at 50 (neutral baseline),
 * 0 decisions, 'stable' trend.
 */
export function initialDimensions(): Record<CeoDimensionKey, CeoDimensionData> {
  const result = {} as Record<CeoDimensionKey, CeoDimensionData>;
  for (const key of DIMENSIONS) {
    result[key] = { score: BASELINE_SCORE, decisions: 0, trend: 'stable' };
  }
  return result;
}

/**
 * Apply a batch of enriched score adjustments from a single decision.
 * For each dimension:
 *  - add the adjustment to the current score, clamp to [0, 100]
 *  - increment `decisions` by 1 only if the adjustment was non-zero
 *  - update `trend`: 'up' when adjustment > 0 and score actually rose,
 *    'down' when adjustment < 0 and score actually fell, else 'stable'
 *    (covers both zero-adjustment and clamp-saturation cases)
 *
 * Returns a new dimensions object; does not mutate the input.
 */
export function applyScoreAdjustments(
  currentDimensions: Record<CeoDimensionKey, CeoDimensionData>,
  adjustments: Partial<CeoDimensionScores>,
): Record<CeoDimensionKey, CeoDimensionData> {
  const next = {} as Record<CeoDimensionKey, CeoDimensionData>;

  for (const key of DIMENSIONS) {
    const current = currentDimensions[key];
    const adjustment = adjustments[key] ?? 0;

    const newScore = clamp(current.score + adjustment, 0, 100);
    const moved = newScore - current.score;

    // Trend reflects what the kid actually observes: both the intent
    // (sign of adjustment) and the realized change must agree, otherwise
    // a clamp-at-ceiling adjustment would deceptively read as 'up'.
    let trend: CeoDimensionData['trend'];
    if (adjustment > 0 && moved > 0) {
      trend = 'up';
    } else if (adjustment < 0 && moved < 0) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    next[key] = {
      score: newScore,
      decisions: current.decisions + (adjustment !== 0 ? 1 : 0),
      trend,
    };
  }

  return next;
}

/**
 * Compute an aggregate running total of decisions across dimensions.
 * Simply sums `decisions` across all 6 — useful for "show me the most
 * decision-rich dimension" queries or sanity-checking the profile.
 */
export function totalDecisionsAcrossDimensions(
  dimensions: Record<CeoDimensionKey, CeoDimensionData>,
): number {
  let total = 0;
  for (const key of DIMENSIONS) {
    total += dimensions[key].decisions;
  }
  return total;
}

/**
 * Name of the strongest dimension (highest score). Returns the
 * CeoDimensionKey, or null if all 6 scores are exactly equal (no
 * meaningful "dominant" answer — typically only true at fresh init).
 */
export function dominantDimension(
  dimensions: Record<CeoDimensionKey, CeoDimensionData>,
): CeoDimensionKey | null {
  // DIMENSIONS is non-empty by construction (6 keys), so first entry exists.
  const firstKey = DIMENSIONS[0] as CeoDimensionKey;
  let bestKey: CeoDimensionKey = firstKey;
  let bestScore = dimensions[firstKey].score;
  let allEqual = true;

  for (let i = 1; i < DIMENSIONS.length; i += 1) {
    const key = DIMENSIONS[i] as CeoDimensionKey;
    const score = dimensions[key].score;
    if (score !== bestScore) allEqual = false;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return allEqual ? null : bestKey;
}

// CeoProfile is imported for documentation/IDE-nav symmetry with the
// SimPrenuer original, which operated on the profile doc directly.
// The helpers above work on the `dimensions` sub-map; the caller
// composes them back into a full CeoProfile.
export type { CeoProfile };
