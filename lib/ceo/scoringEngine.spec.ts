import { describe, it, expect } from 'vitest';
import { enrichScores } from './scoringEngine';
import type { CeoBusiness } from '@/types';

function mkBusiness(overrides: Partial<CeoBusiness> = {}): CeoBusiness {
  const base: CeoBusiness = {
    id: 'biz1',
    userId: 'user1',
    kidId: 'kid1',
    businessName: 'Test',
    businessType: 'lemonade',
    customBusinessDescription: null,
    location: 'Bangalore',
    startingCapital: 300,
    currentCash: 300,
    reputation: 50,
    morale: 50,
    employees: 1,
    phase: 'pre_launch',
    phaseMilestones: {},
    totalDecisions: 0,
    status: 'active',
    pace: '30',
    nextEventAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    completedAt: null,
  };
  return { ...base, ...overrides };
}

describe('enrichScores — clamping', () => {
  it('clamps each dimension to [-10, +10] after enrichment', () => {
    const business = mkBusiness();
    const result = enrichScores(
      {
        risk_calibration: 20,
        capital_discipline: -30,
        growth_instinct: 0,
        operational_rigor: 0,
        people_leadership: 0,
        crisis_response: 0,
      },
      { phase: 'pre_launch', responseTimeSeconds: 60, category: 'growth', business },
    );
    expect(result.risk_calibration).toBeLessThanOrEqual(10);
    expect(result.capital_discipline).toBeGreaterThanOrEqual(-10);
  });

  it('rounds to 1 decimal place', () => {
    const business = mkBusiness();
    const result = enrichScores(
      {
        risk_calibration: 1.2345,
        capital_discipline: 0,
        growth_instinct: 0,
        operational_rigor: 0,
        people_leadership: 0,
        crisis_response: 0,
      },
      { phase: 'early_growth', responseTimeSeconds: 60, category: 'people', business },
    );
    // 1.2345 * 1.0 (early_growth risk mult) = 1.2345 → rounded to 1 decimal = 1.2
    const str = result.risk_calibration.toFixed(2);
    expect(Number.parseFloat(str)).toBe(result.risk_calibration);
  });

  it('defaults missing dimensions to 0 output', () => {
    const business = mkBusiness();
    const result = enrichScores(
      { risk_calibration: 2 },
      { phase: 'early_growth', responseTimeSeconds: 60, category: 'growth', business },
    );
    expect(result.growth_instinct).toBe(0);
    expect(result.capital_discipline).toBe(0);
  });
});

describe('enrichScores — phase multipliers', () => {
  it('pre_launch amplifies risk_calibration (×1.4)', () => {
    const business = mkBusiness();
    // Use responseTimeSeconds=20 to avoid the [30,120] +0.5 bonus, and
    // category='growth' to avoid the <15s crisis/capital adjustments.
    const result = enrichScores(
      { risk_calibration: 2, capital_discipline: 0, growth_instinct: 0, operational_rigor: 0, people_leadership: 0, crisis_response: 0 },
      { phase: 'pre_launch', responseTimeSeconds: 20, category: 'growth', business },
    );
    // 2 * 1.4 (phase) * 1.0 (no state) + 0 (no time adj) = 2.8
    expect(result.risk_calibration).toBeCloseTo(2.8, 1);
  });

  it('pre_launch dampens crisis_response (×0.7)', () => {
    const business = mkBusiness();
    const result = enrichScores(
      { risk_calibration: 0, capital_discipline: 0, growth_instinct: 0, operational_rigor: 0, people_leadership: 0, crisis_response: 5 },
      { phase: 'pre_launch', responseTimeSeconds: 20, category: 'growth', business },
    );
    // 5 * 0.7 = 3.5
    expect(result.crisis_response).toBeCloseTo(3.5, 1);
  });

  it('launch amplifies growth_instinct (×1.4) and operational_rigor (×1.3)', () => {
    const business = mkBusiness();
    const result = enrichScores(
      { risk_calibration: 0, capital_discipline: 0, growth_instinct: 2, operational_rigor: 2, people_leadership: 0, crisis_response: 0 },
      { phase: 'launch', responseTimeSeconds: 20, category: 'growth', business },
    );
    expect(result.growth_instinct).toBeCloseTo(2.8, 1);
    expect(result.operational_rigor).toBeCloseTo(2.6, 1);
  });
});

describe('enrichScores — state-context multipliers', () => {
  it('low cash (<20% of starting) amplifies capital_discipline (×1.5) and risk_calibration (×1.4)', () => {
    const business = mkBusiness({ startingCapital: 300, currentCash: 30 }); // 10%
    const result = enrichScores(
      { risk_calibration: 2, capital_discipline: 2, growth_instinct: 0, operational_rigor: 0, people_leadership: 0, crisis_response: 0 },
      { phase: 'early_growth', responseTimeSeconds: 20, category: 'growth', business },
    );
    // early_growth phase mult: risk 1.0, capital 1.0
    // State mult: risk ×1.4, capital ×1.5
    expect(result.risk_calibration).toBeCloseTo(2 * 1.4, 1);
    expect(result.capital_discipline).toBeCloseTo(2 * 1.5, 1);
  });

  it('low morale (<25) forces people_leadership to max(existing, 1.5)', () => {
    const business = mkBusiness({ morale: 10 });
    const result = enrichScores(
      { risk_calibration: 0, capital_discipline: 0, growth_instinct: 0, operational_rigor: 0, people_leadership: 2, crisis_response: 0 },
      { phase: 'early_growth', responseTimeSeconds: 20, category: 'people', business },
    );
    // early_growth phase mult for people_leadership: 1.4
    // State mult (morale<25): Math.max(1.0, 1.5) = 1.5
    // Combined: 2 * 1.4 * 1.5 = 4.2
    expect(result.people_leadership).toBeCloseTo(4.2, 1);
  });

  it('zero startingCapital does not produce NaN', () => {
    const business = mkBusiness({ startingCapital: 0, currentCash: 0 });
    const result = enrichScores(
      { risk_calibration: 1, capital_discipline: 1, growth_instinct: 1, operational_rigor: 1, people_leadership: 1, crisis_response: 1 },
      { phase: 'pre_launch', responseTimeSeconds: 20, category: 'growth', business },
    );
    for (const v of Object.values(result)) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('enrichScores — response-time adjustments', () => {
  it('<15s on crisis category adds +1 to crisis_response', () => {
    const business = mkBusiness();
    const result = enrichScores(
      { risk_calibration: 0, capital_discipline: 0, growth_instinct: 0, operational_rigor: 0, people_leadership: 0, crisis_response: 0 },
      { phase: 'early_growth', responseTimeSeconds: 10, category: 'crisis', business },
    );
    expect(result.crisis_response).toBe(1);
  });

  it('<15s on capital or risk category docks risk_calibration -1 AND operational_rigor -1', () => {
    const business = mkBusiness();
    const result = enrichScores(
      { risk_calibration: 0, capital_discipline: 0, growth_instinct: 0, operational_rigor: 0, people_leadership: 0, crisis_response: 0 },
      { phase: 'early_growth', responseTimeSeconds: 5, category: 'capital', business },
    );
    expect(result.risk_calibration).toBe(-1);
    expect(result.operational_rigor).toBe(-1);
  });

  it('>300s on non-crisis docks crisis_response by 0.5', () => {
    const business = mkBusiness();
    const result = enrichScores(
      { risk_calibration: 0, capital_discipline: 0, growth_instinct: 0, operational_rigor: 0, people_leadership: 0, crisis_response: 0 },
      { phase: 'early_growth', responseTimeSeconds: 400, category: 'growth', business },
    );
    expect(result.crisis_response).toBe(-0.5);
  });

  it('>300s on crisis category docks crisis_response by 2', () => {
    const business = mkBusiness();
    const result = enrichScores(
      { risk_calibration: 0, capital_discipline: 0, growth_instinct: 0, operational_rigor: 0, people_leadership: 0, crisis_response: 0 },
      { phase: 'early_growth', responseTimeSeconds: 400, category: 'crisis', business },
    );
    expect(result.crisis_response).toBe(-2);
  });

  it('30-120s adds +0.5 to risk_calibration', () => {
    const business = mkBusiness();
    const result = enrichScores(
      { risk_calibration: 0, capital_discipline: 0, growth_instinct: 0, operational_rigor: 0, people_leadership: 0, crisis_response: 0 },
      { phase: 'early_growth', responseTimeSeconds: 60, category: 'growth', business },
    );
    expect(result.risk_calibration).toBe(0.5);
  });
});
