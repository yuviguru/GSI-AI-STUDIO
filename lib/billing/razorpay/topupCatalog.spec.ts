import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTopup, listTopups, TOPUPS } from './topupCatalog';

describe('topupCatalog', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe('catalog shape', () => {
    it('declares three SKUs in ascending credit order', () => {
      const skus = listTopups();
      expect(skus).toHaveLength(3);
      expect(skus[0]?.credits).toBeLessThan(skus[1]!.credits);
      expect(skus[1]?.credits).toBeLessThan(skus[2]!.credits);
    });

    it('larger bundles are cheaper per credit (volume nudge)', () => {
      // Important pricing invariant — if this fails, someone reordered
      // SKUs without considering the buy-up incentive.
      const pricePerCredit = (b: { priceInr: number; credits: number }) =>
        b.priceInr / b.credits;
      expect(pricePerCredit(TOPUPS.credits_500)).toBeLessThan(
        pricePerCredit(TOPUPS.credits_100),
      );
      expect(pricePerCredit(TOPUPS.credits_2000)).toBeLessThan(
        pricePerCredit(TOPUPS.credits_500),
      );
    });

    it('every SKU has a positive INR price and credit count', () => {
      for (const bundle of listTopups()) {
        expect(bundle.priceInr).toBeGreaterThan(0);
        expect(bundle.credits).toBeGreaterThan(0);
        expect(bundle.displayName.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getTopup()', () => {
    it('returns the bundle for a known SKU', () => {
      expect(getTopup('credits_500')?.credits).toBe(500);
    });

    it('returns null for unknown SKUs — never throws', () => {
      expect(getTopup('credits_999')).toBeNull();
      expect(getTopup(undefined)).toBeNull();
      expect(getTopup('')).toBeNull();
    });
  });

  describe('env overrides', () => {
    it('TOPUP_CREDITS_500_INR overrides the displayed price', async () => {
      vi.stubEnv('TOPUP_CREDITS_500_INR', '149');
      vi.resetModules();
      const { TOPUPS: T } = await import('./topupCatalog');
      expect(T.credits_500.priceInr).toBe(149);
    });

    it('non-numeric env value falls back to the default', async () => {
      vi.stubEnv('TOPUP_CREDITS_100_INR', 'free!');
      vi.resetModules();
      const { TOPUPS: T } = await import('./topupCatalog');
      expect(T.credits_100.priceInr).toBe(49); // default
    });

    it('non-positive env value falls back (no zero-rupee SKUs)', async () => {
      vi.stubEnv('TOPUP_CREDITS_100_INR', '0');
      vi.resetModules();
      const { TOPUPS: T } = await import('./topupCatalog');
      expect(T.credits_100.priceInr).toBe(49);
    });
  });
});
