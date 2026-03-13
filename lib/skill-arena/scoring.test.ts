import { describe, it, expect } from 'vitest';
import { scoreToBand, calculateAiPoints, getDifficultyForBand } from './scoring';

// ─── scoreToBand ────────────────────────────────────────

describe('scoreToBand', () => {
  it('returns Band 1 for score 0', () => {
    expect(scoreToBand(0)).toEqual({ band: 1, bandTitle: 'Starter' });
  });

  it('returns Band 1 for score 20', () => {
    expect(scoreToBand(20)).toEqual({ band: 1, bandTitle: 'Starter' });
  });

  it('returns Band 2 for score 21', () => {
    expect(scoreToBand(21)).toEqual({ band: 2, bandTitle: 'Explorer' });
  });

  it('returns Band 3 for score 41', () => {
    expect(scoreToBand(41)).toEqual({ band: 3, bandTitle: 'Achiever' });
  });

  it('returns Band 4 for score 61', () => {
    expect(scoreToBand(61)).toEqual({ band: 4, bandTitle: 'Expert' });
  });

  it('returns Band 5 for score 81', () => {
    expect(scoreToBand(81)).toEqual({ band: 5, bandTitle: 'Champion' });
  });

  it('returns Band 5 for score 100', () => {
    expect(scoreToBand(100)).toEqual({ band: 5, bandTitle: 'Champion' });
  });

  it('clamps negative scores to Band 1', () => {
    expect(scoreToBand(-10)).toEqual({ band: 1, bandTitle: 'Starter' });
  });

  it('clamps scores above 100', () => {
    expect(scoreToBand(150)).toEqual({ band: 5, bandTitle: 'Champion' });
  });

  it('rounds fractional scores', () => {
    expect(scoreToBand(20.7).band).toBe(2); // rounds to 21 → Band 2
    expect(scoreToBand(20.4).band).toBe(1); // rounds to 20 → Band 1
  });
});

// ─── calculateAiPoints ──────────────────────────────────

describe('calculateAiPoints', () => {
  it('returns 20 base points for Band 1 repeat', () => {
    expect(calculateAiPoints(1, false, 1)).toBe(20);
  });

  it('returns 35 for first assessment (20 base + 15 first)', () => {
    expect(calculateAiPoints(1, true, null)).toBe(35);
  });

  it('adds 10 for Band 3+', () => {
    expect(calculateAiPoints(3, false, 3)).toBe(30); // 20 + 10
  });

  it('adds 20 for Band 5 (stacks with Band 3+)', () => {
    expect(calculateAiPoints(5, false, 5)).toBe(50); // 20 + 10 + 20
  });

  it('adds 10 improvement bonus when band increases', () => {
    expect(calculateAiPoints(3, false, 2)).toBe(40); // 20 + 10 (band3) + 10 (improved)
  });

  it('no improvement bonus when band stays same', () => {
    expect(calculateAiPoints(3, false, 3)).toBe(30); // 20 + 10 (band3)
  });

  it('stacks all bonuses', () => {
    // Band 5, first, improved from band 3
    expect(calculateAiPoints(5, true, 3)).toBe(75); // 20 + 10 + 20 + 15 + 10
  });
});

// ─── getDifficultyForBand ───────────────────────────────

describe('getDifficultyForBand', () => {
  it('returns easy for Band 0-2', () => {
    expect(getDifficultyForBand(0)).toBe('easy');
    expect(getDifficultyForBand(1)).toBe('easy');
    expect(getDifficultyForBand(2)).toBe('easy');
  });

  it('returns medium for Band 3', () => {
    expect(getDifficultyForBand(3)).toBe('medium');
  });

  it('returns hard for Band 4+', () => {
    expect(getDifficultyForBand(4)).toBe('hard');
    expect(getDifficultyForBand(5)).toBe('hard');
  });
});
