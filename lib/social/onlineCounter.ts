/**
 * Synthetic "creators online" counter (COMMUNITY-001).
 *
 * Pure functions, no I/O. The number is computed from a deterministic
 * curve so multiple page-loads in the same 5-minute window return the
 * same value (refresh-stable). Crossing a window shifts the number by
 * < 10% of baseline, which feels alive without bouncing.
 *
 * Honesty contract:
 *  - The synthetic counter is NEVER claimed to be a real "right now"
 *    signal. Consumer copy uses "creators online" / "people exploring",
 *    which is ambiguous-defensible (covers active-in-last-hour through
 *    actively-clicking).
 *  - When real concurrent-session telemetry replaces synthetic later
 *    (a separate ANALYTICS-presence story), only this file changes;
 *    the API + UI contract stays the same.
 */

import type { StudioId } from '@gsi/types';

/** Scope of an online count. 'global' = whole platform total. */
export type CommunityScope = StudioId | 'global';

/** Hand-tuned India-time baseline curve. Hour 0-23 in IST. Values are
 *  the synthetic "creators online" for the global scope. Per-studio
 *  scopes apply STUDIO_SHARE_OF_TOTAL below. */
const BASELINE_BY_HOUR_IST: readonly number[] = [
  60, 60, 60, 60, 60, 70,        // 0-5: overnight low
  120, 130, 140,                 // 6-8: morning routine
  100, 100, 100, 100, 100, 110,  // 9-14: school hours dip
  280, 300, 320,                 // 15-17: after-school peak start
  400, 420, 410, 400,            // 18-21: evening peak
  280, 200,                      // 22-23: wind-down
];

/** Per-studio fraction of the global total. Placeholders — re-tune from
 *  real usage once available. */
const STUDIO_SHARE_OF_TOTAL: Readonly<Record<StudioId, number>> = {
  book: 0.30,
  story: 0.25,
  quiz: 0.15,
  music: 0.10,
  comic: 0.10,
  game: 0.10,
};

/** Round a Date down to the 5-minute bucket boundary, in ISO form. */
function toFiveMinBucketIso(now: Date): string {
  const ms = now.getTime();
  const fiveMin = 5 * 60 * 1000;
  const bucket = new Date(Math.floor(ms / fiveMin) * fiveMin);
  return bucket.toISOString();
}

/** Convert UTC Date → IST hour (0-23). IST is UTC+5:30. */
function istHour(now: Date): number {
  // toLocaleString with timeZone is correct but slow; do the math directly.
  const utcMs = now.getTime();
  const istMs = utcMs + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istMs);
  return istDate.getUTCHours();
}

/** Deterministic hash → number in [0, 1). Stable across runs. */
function hash01(s: string): number {
  let h = 2166136261; // FNV-1a seed
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map signed int to unsigned, then to [0, 1).
  return ((h >>> 0) / 0xffffffff);
}

/** Deterministic per-bucket noise in [-0.05, +0.05]. Scope is folded in
 *  so different scopes don't move in lockstep. */
function smoothNoise(bucketIso: string, scope: CommunityScope): number {
  const h = hash01(`${bucketIso}|${scope}`);
  return (h - 0.5) * 0.1; // [-0.05, +0.05]
}

/** The exported entry point. Returns the synthetic online count for the
 *  given scope at the given moment. */
export function getSyntheticOnlineCount(
  scope: CommunityScope,
  now: Date = new Date(),
): number {
  const hour = istHour(now);
  const globalBaseline = BASELINE_BY_HOUR_IST[hour] ?? 200;
  const bucket = toFiveMinBucketIso(now);

  if (scope === 'global') {
    const noise = smoothNoise(bucket, scope);
    const value = globalBaseline * (1 + noise);
    return Math.round(value);
  }

  // Per-studio: take the studio's share of the global baseline, apply noise.
  const share = STUDIO_SHARE_OF_TOTAL[scope];
  const studioBaseline = globalBaseline * share;
  const noise = smoothNoise(bucket, scope);
  const value = studioBaseline * (1 + noise);
  return Math.max(1, Math.round(value));
}

/** Exposed for tests + admin tooling. */
export const __internals = {
  BASELINE_BY_HOUR_IST,
  STUDIO_SHARE_OF_TOTAL,
  toFiveMinBucketIso,
  istHour,
  hash01,
  smoothNoise,
};
