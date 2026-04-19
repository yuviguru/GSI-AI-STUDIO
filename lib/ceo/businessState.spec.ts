import { describe, it, expect } from 'vitest';
import { applyStateChanges } from './businessState';
import type { CeoBusiness } from '@/types';

function mkBusiness(overrides: Partial<CeoBusiness> = {}): CeoBusiness {
  const base: CeoBusiness = {
    id: 'biz1',
    sessionId: 'sess1',
    userId: null,
    kidId: null,
    businessName: 'Test',
    businessType: 'lemonade',
    customBusinessDescription: null,
    location: 'Bangalore',
    startingCapital: 300,
    currentCash: 200,
    reputation: 50,
    morale: 50,
    employees: 1,
    phase: 'pre_launch',
    phaseMilestones: { BRAND: 'pending', LOCATION: 'pending' },
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

describe('applyStateChanges', () => {
  it('increments totalDecisions by exactly 1 on an all-zero delta', () => {
    const b = mkBusiness({ totalDecisions: 7 });
    const next = applyStateChanges(b, {});
    expect(next.totalDecisions).toBe(8);
  });

  it('adds cash_delta to currentCash', () => {
    const b = mkBusiness({ currentCash: 200 });
    expect(applyStateChanges(b, { cash_delta: 50 }).currentCash).toBe(250);
  });

  it('floors cash at 0 when delta would drive it negative', () => {
    const b = mkBusiness({ currentCash: 30 });
    expect(applyStateChanges(b, { cash_delta: -500 }).currentCash).toBe(0);
  });

  it('clamps reputation to [0, 100]', () => {
    const b1 = mkBusiness({ reputation: 80 });
    expect(applyStateChanges(b1, { reputation_delta: 200 }).reputation).toBe(100);
    const b2 = mkBusiness({ reputation: 10 });
    expect(applyStateChanges(b2, { reputation_delta: -50 }).reputation).toBe(0);
  });

  it('clamps morale to [0, 100]', () => {
    const b1 = mkBusiness({ morale: 90 });
    expect(applyStateChanges(b1, { morale_delta: 50 }).morale).toBe(100);
    const b2 = mkBusiness({ morale: 5 });
    expect(applyStateChanges(b2, { morale_delta: -20 }).morale).toBe(0);
  });

  it('averages morale_delta with customer_satisfaction_delta when both present', () => {
    const b = mkBusiness({ morale: 50 });
    // avg of +10 and +4 = +7 → morale = 57
    const next = applyStateChanges(b, { morale_delta: 10, customer_satisfaction_delta: 4 });
    expect(next.morale).toBe(57);
  });

  it('uses customer_satisfaction_delta as-is when morale_delta is absent', () => {
    const b = mkBusiness({ morale: 40 });
    const next = applyStateChanges(b, { customer_satisfaction_delta: 8 });
    expect(next.morale).toBe(48);
  });

  it('does not change morale when neither morale nor satisfaction delta is given (no NaN)', () => {
    const b = mkBusiness({ morale: 42 });
    const next = applyStateChanges(b, { cash_delta: -10 });
    expect(next.morale).toBe(42);
    expect(Number.isNaN(next.morale)).toBe(false);
  });

  it('ignores revenue_delta and expenses_delta (schema-compat tolerance)', () => {
    const b = mkBusiness({ currentCash: 100 });
    const next = applyStateChanges(b, { revenue_delta: 10000, expenses_delta: -5000 });
    expect(next.currentCash).toBe(100);
  });

  it('does not mutate the input business object', () => {
    const b = mkBusiness({ currentCash: 200, totalDecisions: 0 });
    const before = JSON.stringify(b);
    applyStateChanges(b, { cash_delta: 50 });
    expect(JSON.stringify(b)).toBe(before);
  });
});
