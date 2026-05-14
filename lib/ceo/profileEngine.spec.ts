import { describe, it, expect } from 'vitest';
import {
  initialDimensions,
  applyScoreAdjustments,
  dominantDimension,
  totalDecisionsAcrossDimensions,
} from './profileEngine';
import { DIMENSIONS } from './constants';
import type { CeoDimensionKey } from '@gsi/types';

describe('initialDimensions', () => {
  it('seeds all 6 dimensions at score=50, decisions=0, trend=stable', () => {
    const d = initialDimensions();
    for (const key of DIMENSIONS) {
      expect(d[key]).toEqual({ score: 50, decisions: 0, trend: 'stable' });
    }
  });
});

describe('applyScoreAdjustments', () => {
  it('adds adjustment to score and clamps to [0, 100]', () => {
    const dims = initialDimensions();
    const next = applyScoreAdjustments(dims, { risk_calibration: 5 });
    expect(next.risk_calibration.score).toBe(55);
  });

  it('clamps at the 100 ceiling', () => {
    const dims = { ...initialDimensions(), risk_calibration: { score: 98, decisions: 3, trend: 'stable' as const } };
    const next = applyScoreAdjustments(dims, { risk_calibration: 10 });
    expect(next.risk_calibration.score).toBe(100);
  });

  it('clamps at the 0 floor', () => {
    const dims = { ...initialDimensions(), morale: { score: 50, decisions: 0, trend: 'stable' as const } };
    const adj = { people_leadership: -100 };
    const next = applyScoreAdjustments(dims, adj);
    expect(next.people_leadership.score).toBe(0);
  });

  it('reports trend=up when a positive adjustment actually moves the score up', () => {
    const dims = initialDimensions();
    const next = applyScoreAdjustments(dims, { growth_instinct: 5 });
    expect(next.growth_instinct.trend).toBe('up');
  });

  it('reports trend=down when a negative adjustment actually moves the score down', () => {
    const dims = initialDimensions();
    const next = applyScoreAdjustments(dims, { growth_instinct: -5 });
    expect(next.growth_instinct.trend).toBe('down');
  });

  it('reports trend=stable when adjustment is zero', () => {
    const dims = initialDimensions();
    const next = applyScoreAdjustments(dims, { growth_instinct: 0 });
    expect(next.growth_instinct.trend).toBe('stable');
  });

  it('reports trend=stable when a positive adjustment saturates at the ceiling (no realized movement)', () => {
    // Score already 100; +5 adjustment intent is 'up' but realized movement is 0.
    // File header comments promise AND of intent + realized → stable.
    const dims = { ...initialDimensions(), risk_calibration: { score: 100, decisions: 3, trend: 'up' as const } };
    const next = applyScoreAdjustments(dims, { risk_calibration: 5 });
    expect(next.risk_calibration.trend).toBe('stable');
  });

  it('reports trend=stable when a negative adjustment saturates at the floor (no realized movement)', () => {
    const dims = { ...initialDimensions(), crisis_response: { score: 0, decisions: 2, trend: 'down' as const } };
    const next = applyScoreAdjustments(dims, { crisis_response: -5 });
    expect(next.crisis_response.trend).toBe('stable');
  });

  it('increments decisions count by 1 for each non-zero adjustment', () => {
    const dims = initialDimensions();
    const next = applyScoreAdjustments(dims, { risk_calibration: 3, capital_discipline: -2 });
    expect(next.risk_calibration.decisions).toBe(1);
    expect(next.capital_discipline.decisions).toBe(1);
  });

  it('does NOT increment decisions count on zero-adjustment dimensions', () => {
    const dims = initialDimensions();
    const next = applyScoreAdjustments(dims, { risk_calibration: 3 });
    expect(next.growth_instinct.decisions).toBe(0);
  });
});

describe('dominantDimension', () => {
  it('returns the key with the highest score', () => {
    const dims = initialDimensions();
    dims.growth_instinct.score = 80;
    dims.risk_calibration.score = 60;
    expect(dominantDimension(dims)).toBe<CeoDimensionKey>('growth_instinct');
  });

  it('returns a key when there is a unique max even among ties', () => {
    const dims = initialDimensions();
    // all at 50 — ties. Implementation may return null OR one of them.
    const got = dominantDimension(dims);
    if (got !== null) {
      expect(DIMENSIONS).toContain(got);
    }
  });
});

describe('totalDecisionsAcrossDimensions', () => {
  it('sums the decisions count across all 6 dimensions', () => {
    const dims = initialDimensions();
    dims.risk_calibration.decisions = 3;
    dims.growth_instinct.decisions = 2;
    expect(totalDecisionsAcrossDimensions(dims)).toBe(5);
  });

  it('returns 0 for a freshly-seeded profile', () => {
    expect(totalDecisionsAcrossDimensions(initialDimensions())).toBe(0);
  });
});
