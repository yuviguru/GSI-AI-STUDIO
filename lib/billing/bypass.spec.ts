import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldBypass, isUnmetered } from './bypass';

describe('lib/billing/bypass', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.BILLING_BYPASS;
    delete process.env.BILLING_BYPASS_KIDS;
    delete process.env.ALLOW_BILLING_BYPASS_IN_PROD;
    // Silence the prod-bypass console.warn so test output stays clean.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('shouldBypass()', () => {
    it('returns false when no env vars are set (default fails closed)', () => {
      expect(shouldBypass('kid_1')).toBe(false);
      expect(shouldBypass()).toBe(false);
    });

    it('returns true when BILLING_BYPASS=true for any kid', () => {
      vi.stubEnv('BILLING_BYPASS', 'true');
      vi.stubEnv('NODE_ENV', 'development');
      expect(shouldBypass('kid_1')).toBe(true);
      expect(shouldBypass('kid_999')).toBe(true);
      expect(shouldBypass()).toBe(true);
    });

    it('honors BILLING_BYPASS_KIDS allowlist', () => {
      vi.stubEnv('BILLING_BYPASS_KIDS', 'alice,bob,charlie');
      vi.stubEnv('NODE_ENV', 'development');
      expect(shouldBypass('alice')).toBe(true);
      expect(shouldBypass('bob')).toBe(true);
      expect(shouldBypass('dan')).toBe(false);
      // No kidId provided + no global flag = no bypass
      expect(shouldBypass()).toBe(false);
    });

    it('trims whitespace in the allowlist', () => {
      vi.stubEnv('BILLING_BYPASS_KIDS', ' alice , bob ');
      vi.stubEnv('NODE_ENV', 'development');
      expect(shouldBypass('alice')).toBe(true);
      expect(shouldBypass('bob')).toBe(true);
    });

    it('ignores empty allowlist entries', () => {
      vi.stubEnv('BILLING_BYPASS_KIDS', 'alice,,,bob');
      vi.stubEnv('NODE_ENV', 'development');
      // Empty string is NOT a kid ID — must not bypass
      expect(shouldBypass('')).toBe(false);
      expect(shouldBypass('alice')).toBe(true);
    });

    describe('production guardrail', () => {
      it('refuses BILLING_BYPASS in NODE_ENV=production by default', () => {
        vi.stubEnv('BILLING_BYPASS', 'true');
        vi.stubEnv('NODE_ENV', 'production');
        expect(shouldBypass('alice')).toBe(false);
      });

      it('refuses BILLING_BYPASS_KIDS in production by default', () => {
        vi.stubEnv('BILLING_BYPASS_KIDS', 'alice');
        vi.stubEnv('NODE_ENV', 'production');
        expect(shouldBypass('alice')).toBe(false);
      });

      it('allows bypass when ALLOW_BILLING_BYPASS_IN_PROD=true', () => {
        vi.stubEnv('BILLING_BYPASS', 'true');
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('ALLOW_BILLING_BYPASS_IN_PROD', 'true');
        expect(shouldBypass('alice')).toBe(true);
      });

      it('logs a warning when bypass fires in production', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.stubEnv('BILLING_BYPASS', 'true');
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('ALLOW_BILLING_BYPASS_IN_PROD', 'true');
        shouldBypass('alice');
        expect(warnSpy).toHaveBeenCalled();
        const msg = warnSpy.mock.calls[0]?.[0] as string;
        expect(msg).toContain('BYPASS active in production');
        expect(msg).toContain('alice');
      });
    });
  });

  describe('isUnmetered()', () => {
    it('returns true for admin role even without bypass', () => {
      expect(isUnmetered({ plan: 'admin' })).toBe(true);
    });

    it('returns true for bypass-listed kid', () => {
      vi.stubEnv('BILLING_BYPASS_KIDS', 'kid_1');
      vi.stubEnv('NODE_ENV', 'development');
      expect(isUnmetered({ kidId: 'kid_1', plan: 'free' })).toBe(true);
    });

    it('returns false for a normal free kid', () => {
      expect(isUnmetered({ kidId: 'kid_1', plan: 'free' })).toBe(false);
    });
  });
});
