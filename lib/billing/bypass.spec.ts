import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldBypass } from './bypass';

describe('lib/billing/bypass.shouldBypass', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.BILLING_BYPASS;
    delete process.env.BILLING_BYPASS_KIDS;
    delete process.env.ALLOW_BILLING_BYPASS_IN_PROD;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

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
    expect(shouldBypass()).toBe(false);
  });

  it('trims whitespace and ignores empty allowlist entries', () => {
    vi.stubEnv('BILLING_BYPASS_KIDS', ' alice ,,bob ,');
    vi.stubEnv('NODE_ENV', 'development');
    expect(shouldBypass('alice')).toBe(true);
    expect(shouldBypass('bob')).toBe(true);
    expect(shouldBypass('')).toBe(false);
  });

  describe('production guardrail', () => {
    it('refuses bypass env vars in NODE_ENV=production by default', () => {
      vi.stubEnv('BILLING_BYPASS', 'true');
      vi.stubEnv('NODE_ENV', 'production');
      expect(shouldBypass('alice')).toBe(false);

      vi.stubEnv('BILLING_BYPASS', '');
      vi.stubEnv('BILLING_BYPASS_KIDS', 'alice');
      expect(shouldBypass('alice')).toBe(false);
    });

    it('allows bypass when ALLOW_BILLING_BYPASS_IN_PROD=true', () => {
      vi.stubEnv('BILLING_BYPASS', 'true');
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('ALLOW_BILLING_BYPASS_IN_PROD', 'true');
      expect(shouldBypass('alice')).toBe(true);
    });

    it('logs a warning with a TRUNCATED kid ID when bypass fires in production', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubEnv('BILLING_BYPASS', 'true');
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('ALLOW_BILLING_BYPASS_IN_PROD', 'true');
      shouldBypass('kid_abcdef123456');
      expect(warnSpy).toHaveBeenCalled();
      const msg = warnSpy.mock.calls[0]?.[0] as string;
      expect(msg).toContain('BYPASS active in production');
      // The full kid ID must NOT appear — it's PII in shared logs.
      expect(msg).not.toContain('kid_abcdef123456');
    });
  });
});
