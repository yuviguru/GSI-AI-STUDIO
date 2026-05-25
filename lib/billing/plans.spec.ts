import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PLANS, PLAN_IDS, DEFAULT_PLAN, getPlan } from './plans';

describe('lib/billing/plans', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Strip any PLAN_* overrides so each test starts from a clean slate.
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('PLAN_')) delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('catalog shape', () => {
    it('declares the expected plan IDs in display order', () => {
      // Source-of-truth check — Pricing.tsx renders Object.values(PLANS) and
      // expects this exact order (sans admin which it filters out).
      expect(PLAN_IDS).toEqual(['free', 'creator', 'pro', 'school', 'admin']);
    });

    it('default plan is free', () => {
      expect(DEFAULT_PLAN).toBe('free');
    });

    it('every PLAN_IDS entry exists in PLANS', () => {
      for (const id of PLAN_IDS) {
        expect(PLANS[id]).toBeDefined();
        expect(PLANS[id].id).toBe(id);
      }
    });

    it('free is ₹0, school is custom (null), admin is custom (null)', () => {
      expect(PLANS.free.price.inr).toBe(0);
      expect(PLANS.school.price.inr).toBeNull();
      expect(PLANS.admin.price.inr).toBeNull();
    });

    it('admin plan has Infinity monthly credits — short-circuit for guard', () => {
      expect(PLANS.admin.creditsPerMonth).toBe(Number.POSITIVE_INFINITY);
    });

    it('paid tiers monotonically increase credits', () => {
      // Sanity: a higher plan should never have fewer credits than a lower one.
      expect(PLANS.creator.creditsPerMonth).toBeGreaterThan(PLANS.free.creditsPerMonth);
      expect(PLANS.pro.creditsPerMonth).toBeGreaterThan(PLANS.creator.creditsPerMonth);
    });

    it('every plan declares a CTA and at least one feature bullet', () => {
      // Marketing safety — Pricing.tsx renders these as-is. Empty rows would
      // produce a broken card.
      for (const id of PLAN_IDS) {
        const plan = PLANS[id];
        expect(plan.marketing.cta.label.length).toBeGreaterThan(0);
        expect(plan.marketing.cta.href.length).toBeGreaterThan(0);
        expect(plan.marketing.features.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getPlan()', () => {
    it('returns the matching plan for a known ID', () => {
      expect(getPlan('pro').id).toBe('pro');
    });

    it('falls back to free for unknown IDs — defensive against stale docs', () => {
      // A stale `plan: 'family'` from before the rename must not throw.
      expect(getPlan('family').id).toBe('free');
      expect(getPlan('mystery-tier').id).toBe('free');
    });

    it('falls back to free for null / undefined / empty', () => {
      expect(getPlan(null).id).toBe('free');
      expect(getPlan(undefined).id).toBe('free');
      expect(getPlan('').id).toBe('free');
    });
  });

  describe('env overrides', () => {
    // Plans evaluate envNumber() at module load. We use vi.resetModules() +
    // dynamic re-import so the override takes effect for each test.
    afterEach(() => {
      vi.resetModules();
    });

    it('PLAN_PRO_CREDITS overrides the monthly grant size', async () => {
      vi.stubEnv('PLAN_PRO_CREDITS', '3000');
      vi.resetModules();
      const { PLANS: P } = await import('./plans');
      expect(P.pro.creditsPerMonth).toBe(3000);
      vi.unstubAllEnvs();
    });

    it('invalid env value falls back to default — never NaN', async () => {
      vi.stubEnv('PLAN_FREE_CREDITS', 'not-a-number');
      vi.resetModules();
      const { PLANS: P } = await import('./plans');
      expect(P.free.creditsPerMonth).toBe(50);
      expect(Number.isFinite(P.free.creditsPerMonth)).toBe(true);
      vi.unstubAllEnvs();
    });

    it('PLAN_CREATOR_PRICE_INR overrides the displayed price', async () => {
      vi.stubEnv('PLAN_CREATOR_PRICE_INR', '149');
      vi.resetModules();
      const { PLANS: P } = await import('./plans');
      expect(P.creator.price.inr).toBe(149);
      vi.unstubAllEnvs();
    });
  });
});
