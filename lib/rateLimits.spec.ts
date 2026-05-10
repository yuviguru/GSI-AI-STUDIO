import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPlanLimits } from './rateLimits';

describe('getPlanLimits', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.PLAN_LIMITS_PRO_DAY;
    delete process.env.PLAN_LIMITS_PRO_TIER;
    delete process.env.PLAN_LIMITS_FREE_DAY;
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns defaults for free', () => {
    const limits = getPlanLimits('free');
    expect(limits.creationsPerDay).toBe(3);
    expect(limits.maxCostTier).toBe('cheap');
  });

  it('Pro is 50/day at premium tier — caps worst-case loss', () => {
    const limits = getPlanLimits('pro');
    expect(limits.creationsPerDay).toBe(50);
    expect(limits.maxCostTier).toBe('premium');
  });

  it('Creator slots between Free and Pro', () => {
    const limits = getPlanLimits('creator');
    expect(limits.creationsPerDay).toBe(15);
    expect(limits.maxCostTier).toBe('standard');
  });

  it('schools defaults to per-student soft cap', () => {
    const limits = getPlanLimits('school');
    expect(limits.creationsPerDay).toBe(10);
  });

  it('unknown plan falls back to free', () => {
    const limits = getPlanLimits('mystery-tier');
    expect(limits.creationsPerDay).toBe(3);
  });

  it('env override changes the cap without code changes', () => {
    process.env.PLAN_LIMITS_PRO_DAY = '100';
    expect(getPlanLimits('pro').creationsPerDay).toBe(100);
  });

  it('env override changes the cost tier ceiling', () => {
    process.env.PLAN_LIMITS_PRO_TIER = 'standard';
    expect(getPlanLimits('pro').maxCostTier).toBe('standard');
  });
});
