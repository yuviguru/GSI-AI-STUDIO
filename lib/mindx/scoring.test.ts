import { describe, it, expect } from 'vitest';
import {
  calculateTotalScore,
  getBand,
  getBandTitle,
  getDifficulty,
  calculatePoints,
  detectBandImprovement,
  getStrongestModule,
  getRecommendedModule,
} from './scoring';
import type { SkillArenaChallengeResult } from '@/types/mindx.types';

// ─── Helper factories ─────────────────────────────────────

function makeResult(score: number, maxScore: number = 20): SkillArenaChallengeResult {
  return {
    challengeId: `test-${Math.random()}`,
    score,
    maxScore,
    feedback: 'Test feedback',
  };
}

// ─── calculateTotalScore ─────────────────────────────────

describe('calculateTotalScore', () => {
  it('returns 0 for empty results', () => {
    expect(calculateTotalScore([])).toBe(0);
  });

  it('returns 100 for perfect scores', () => {
    const results = [makeResult(20), makeResult(20), makeResult(20), makeResult(20), makeResult(20)];
    expect(calculateTotalScore(results)).toBe(100);
  });

  it('returns 0 for all zeros', () => {
    const results = [makeResult(0), makeResult(0), makeResult(0)];
    expect(calculateTotalScore(results)).toBe(0);
  });

  it('calculates correct percentage', () => {
    // 10+15+20+5+10 = 60 out of 100 = 60%
    const results = [makeResult(10), makeResult(15), makeResult(20), makeResult(5), makeResult(10)];
    expect(calculateTotalScore(results)).toBe(60);
  });

  it('rounds to nearest integer', () => {
    // 7 out of 20 = 35%
    const results = [makeResult(7)];
    expect(calculateTotalScore(results)).toBe(35);
  });

  it('handles different maxScores', () => {
    const results = [
      makeResult(5, 10),
      makeResult(10, 10),
    ];
    // 15 out of 20 = 75%
    expect(calculateTotalScore(results)).toBe(75);
  });
});

// ─── getBand ─────────────────────────────────────────────

describe('getBand', () => {
  it('returns band 1 (Starter) for score 0', () => {
    const band = getBand(0);
    expect(band.band).toBe(1);
    expect(band.title).toBe('Starter');
  });

  it('returns band 1 for score 20', () => {
    expect(getBand(20).band).toBe(1);
  });

  it('returns band 2 (Explorer) for score 21', () => {
    expect(getBand(21).band).toBe(2);
    expect(getBand(21).title).toBe('Explorer');
  });

  it('returns band 3 (Achiever) for score 41', () => {
    expect(getBand(41).band).toBe(3);
    expect(getBand(41).title).toBe('Achiever');
  });

  it('returns band 4 (Expert) for score 61', () => {
    expect(getBand(61).band).toBe(4);
    expect(getBand(61).title).toBe('Expert');
  });

  it('returns band 5 (Champion) for score 81', () => {
    expect(getBand(81).band).toBe(5);
    expect(getBand(81).title).toBe('Champion');
  });

  it('returns band 5 for score 100', () => {
    expect(getBand(100).band).toBe(5);
  });

  it('clamps negative scores to band 1', () => {
    expect(getBand(-10).band).toBe(1);
  });

  it('clamps scores above 100 to band 5', () => {
    expect(getBand(150).band).toBe(5);
  });

  it('returns boundary scores correctly', () => {
    expect(getBand(40).band).toBe(2); // 40 is still Explorer (minScore 21)
    expect(getBand(60).band).toBe(3); // 60 is still Achiever (minScore 41)
    expect(getBand(80).band).toBe(4); // 80 is still Expert (minScore 61)
  });
});

// ─── getBandTitle ────────────────────────────────────────

describe('getBandTitle', () => {
  it('returns correct titles for each band', () => {
    expect(getBandTitle(1)).toBe('Starter');
    expect(getBandTitle(2)).toBe('Explorer');
    expect(getBandTitle(3)).toBe('Achiever');
    expect(getBandTitle(4)).toBe('Expert');
    expect(getBandTitle(5)).toBe('Champion');
  });

  it('defaults to Starter for unknown band', () => {
    expect(getBandTitle(0)).toBe('Starter');
    expect(getBandTitle(99)).toBe('Starter');
  });
});

// ─── getDifficulty ───────────────────────────────────────

describe('getDifficulty', () => {
  it('returns medium for first assessment (null previous)', () => {
    expect(getDifficulty(null)).toBe('medium');
  });

  it('returns easy for band 1', () => {
    expect(getDifficulty(1)).toBe('easy');
  });

  it('returns easy for band 2', () => {
    expect(getDifficulty(2)).toBe('easy');
  });

  it('returns medium for band 3', () => {
    expect(getDifficulty(3)).toBe('medium');
  });

  it('returns hard for band 4', () => {
    expect(getDifficulty(4)).toBe('hard');
  });

  it('returns hard for band 5', () => {
    expect(getDifficulty(5)).toBe('hard');
  });
});

// ─── calculatePoints ────────────────────────────────────

describe('calculatePoints', () => {
  it('gives 20 base points', () => {
    expect(calculatePoints({ band: 1, isFirstForModule: false, previousBand: 1 })).toBe(20);
  });

  it('gives +10 bonus for band 3+', () => {
    expect(calculatePoints({ band: 3, isFirstForModule: false, previousBand: 3 })).toBe(30);
  });

  it('gives +10 and +20 bonus for band 5', () => {
    // base 20 + band3+ 10 + band5 20 = 50
    expect(calculatePoints({ band: 5, isFirstForModule: false, previousBand: 5 })).toBe(50);
  });

  it('gives +15 bonus for first assessment', () => {
    expect(calculatePoints({ band: 1, isFirstForModule: true, previousBand: null })).toBe(35);
  });

  it('gives +10 bonus for improvement', () => {
    // base 20 + band3 10 + improvement 10 = 40
    expect(calculatePoints({ band: 3, isFirstForModule: false, previousBand: 2 })).toBe(40);
  });

  it('stacks all bonuses correctly', () => {
    // band 5: base 20 + band3+ 10 + band5 20 + first 15 = 65
    expect(calculatePoints({ band: 5, isFirstForModule: true, previousBand: null })).toBe(65);
  });

  it('does not give improvement bonus when band stays same', () => {
    expect(calculatePoints({ band: 2, isFirstForModule: false, previousBand: 2 })).toBe(20);
  });

  it('does not give improvement bonus when band drops', () => {
    expect(calculatePoints({ band: 1, isFirstForModule: false, previousBand: 3 })).toBe(20);
  });
});

// ─── detectBandImprovement ──────────────────────────────

describe('detectBandImprovement', () => {
  it('returns false for first assessment (null previous)', () => {
    expect(detectBandImprovement(3, null)).toBe(false);
  });

  it('returns true when band improves', () => {
    expect(detectBandImprovement(3, 2)).toBe(true);
  });

  it('returns false when band stays same', () => {
    expect(detectBandImprovement(3, 3)).toBe(false);
  });

  it('returns false when band drops', () => {
    expect(detectBandImprovement(2, 3)).toBe(false);
  });
});

// ─── getStrongestModule ─────────────────────────────────

describe('getStrongestModule', () => {
  it('returns null with no data', () => {
    expect(getStrongestModule({})).toBeNull();
  });

  it('returns module with highest band', () => {
    expect(getStrongestModule({
      speaking: { band: 3, assessments: 1 },
      thinking: { band: 5, assessments: 2 },
      reading: { band: 2, assessments: 1 },
    })).toBe('thinking');
  });

  it('ignores modules with 0 assessments', () => {
    expect(getStrongestModule({
      speaking: { band: 5, assessments: 0 },
      thinking: { band: 2, assessments: 1 },
    })).toBe('thinking');
  });
});

// ─── getRecommendedModule ───────────────────────────────

describe('getRecommendedModule', () => {
  it('recommends untried modules first', () => {
    const result = getRecommendedModule({
      speaking: { band: 3, assessments: 1 },
    });
    // Should recommend one of the untried modules
    expect(['listening', 'thinking', 'reading']).toContain(result);
  });

  it('recommends weakest module when all tried', () => {
    expect(getRecommendedModule({
      speaking: { band: 4, assessments: 2 },
      listening: { band: 2, assessments: 1 },
      thinking: { band: 3, assessments: 1 },
      reading: { band: 5, assessments: 3 },
    })).toBe('listening');
  });

  it('returns null for empty data', () => {
    expect(getRecommendedModule({})).toBe('speaking');
  });
});
