import type {
  SkillArenaBand,
  SkillArenaBandTitle,
  SkillArenaChallengeResult,
  SkillArenaDifficulty,
  SkillArenaModule,
} from '@/types/mindx.types';
import { SKILL_ARENA_BANDS } from '@/types/mindx.types';

/** Calculate overall score (0-100) from individual challenge results */
export function calculateTotalScore(results: SkillArenaChallengeResult[]): number {
  if (results.length === 0) return 0;

  const totalEarned = results.reduce((sum, r) => sum + r.score, 0);
  const totalMax = results.reduce((sum, r) => sum + r.maxScore, 0);

  if (totalMax === 0) return 0;
  return Math.round((totalEarned / totalMax) * 100);
}

/** Get band (1-5) from a score (0-100) */
export function getBand(score: number): SkillArenaBand {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  for (let i = SKILL_ARENA_BANDS.length - 1; i >= 0; i--) {
    if (clamped >= SKILL_ARENA_BANDS[i]!.minScore) {
      return SKILL_ARENA_BANDS[i]!;
    }
  }

  return SKILL_ARENA_BANDS[0]!;
}

/** Get band title from band number */
export function getBandTitle(band: number): SkillArenaBandTitle {
  const found = SKILL_ARENA_BANDS.find((b) => b.band === band);
  return found?.title ?? 'Starter';
}

/** Determine difficulty for next assessment based on previous band */
export function getDifficulty(previousBand: number | null): SkillArenaDifficulty {
  if (previousBand === null) return 'medium';
  if (previousBand <= 2) return 'easy';
  if (previousBand === 3) return 'medium';
  return 'hard';
}

/** Calculate AI points earned from an assessment */
export function calculatePoints(opts: {
  band: number;
  isFirstForModule: boolean;
  previousBand: number | null;
}): number {
  let points = 20; // base

  if (opts.band >= 3) points += 10;
  if (opts.band >= 5) points += 20;
  if (opts.isFirstForModule) points += 15;
  if (opts.previousBand !== null && opts.band > opts.previousBand) points += 10;

  return points;
}

/** Check if the band improved from previous attempt */
export function detectBandImprovement(
  currentBand: number,
  previousBand: number | null,
): boolean {
  if (previousBand === null) return false;
  return currentBand > previousBand;
}

/** Get the module with the highest band from progress data */
export function getStrongestModule(
  moduleScores: Partial<Record<SkillArenaModule, { band: number; assessments: number }>>,
): SkillArenaModule | null {
  let best: SkillArenaModule | null = null;
  let bestBand = 0;

  for (const [mod, data] of Object.entries(moduleScores)) {
    if (data && data.assessments > 0 && data.band > bestBand) {
      bestBand = data.band;
      best = mod as SkillArenaModule;
    }
  }

  return best;
}

/** Get the module with the lowest band (for recommendation) */
export function getRecommendedModule(
  moduleScores: Partial<Record<SkillArenaModule, { band: number; assessments: number }>>,
): SkillArenaModule | null {
  const allModules: SkillArenaModule[] = ['speaking', 'listening', 'thinking', 'reading'];

  // Recommend untried modules first
  for (const mod of allModules) {
    if (!moduleScores[mod] || moduleScores[mod]!.assessments === 0) {
      return mod;
    }
  }

  // Otherwise recommend weakest
  let weakest: SkillArenaModule | null = null;
  let weakestBand = 6;

  for (const [mod, data] of Object.entries(moduleScores)) {
    if (data && data.band < weakestBand) {
      weakestBand = data.band;
      weakest = mod as SkillArenaModule;
    }
  }

  return weakest;
}
