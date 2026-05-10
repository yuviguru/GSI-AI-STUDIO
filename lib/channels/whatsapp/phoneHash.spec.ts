import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashPhoneNumber } from './phoneHash';

describe('hashPhoneNumber', () => {
  const originalPepper = process.env.PHONE_HASH_PEPPER;

  beforeEach(() => {
    process.env.PHONE_HASH_PEPPER =
      'test-pepper-must-be-at-least-16-chars-long-for-realism';
    // Force re-cache by reloading the module would be cleanest, but the
    // module-level cache means we accept first-set wins for the test run.
  });
  afterEach(() => {
    if (originalPepper === undefined) delete process.env.PHONE_HASH_PEPPER;
    else process.env.PHONE_HASH_PEPPER = originalPepper;
  });

  it('produces a deterministic hash', () => {
    const a = hashPhoneNumber('917890123456');
    const b = hashPhoneNumber('917890123456');
    expect(a).toBe(b);
  });

  it('normalizes formatting — same number, different format → same hash', () => {
    const formats = [
      '917890123456',
      '+91 7890 123456',
      '+91-7890-123456',
      '91-78901-23456',
    ];
    const hashes = formats.map(hashPhoneNumber);
    expect(new Set(hashes).size).toBe(1);
  });

  it('different numbers produce different hashes', () => {
    expect(hashPhoneNumber('917890123456')).not.toBe(hashPhoneNumber('917890123457'));
  });

  it('returns a stable hex string of expected length (64 chars for SHA-256)', () => {
    const h = hashPhoneNumber('917890123456');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});
