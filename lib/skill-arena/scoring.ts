import type { SkillArenaBandTitle, SkillArenaDifficulty } from '@/types/mindx.types';
import { SKILL_ARENA_BANDS } from '@/types/mindx.types';

/** Map a 0-100 score to a band (1-5) and title */
export function scoreToBand(score: number): { band: number; bandTitle: SkillArenaBandTitle } {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  let matched = SKILL_ARENA_BANDS[0]!;
  for (const b of SKILL_ARENA_BANDS) {
    if (clamped >= b.minScore) matched = b;
  }
  return { band: matched.band, bandTitle: matched.title };
}

/** Calculate AI points earned for an assessment */
export function calculateAiPoints(
  band: number,
  isFirstForModule: boolean,
  previousBand: number | null,
): number {
  let points = 20; // Base points for completing

  if (band >= 3) points += 10;   // Band 3+ bonus
  if (band >= 5) points += 20;   // Band 5 bonus (stacks with Band 3+)
  if (isFirstForModule) points += 15; // First assessment per module
  if (previousBand !== null && band > previousBand) points += 10; // Improvement bonus

  return points;
}

/** Get assessment difficulty based on previous band score */
export function getDifficultyForBand(band: number): SkillArenaDifficulty {
  if (band <= 2) return 'easy';
  if (band <= 3) return 'medium';
  return 'hard';
}
