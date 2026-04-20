import { describe, it, expect } from 'vitest';
import { timestampToMillis } from './timestamps';

describe('timestampToMillis', () => {
  it('returns 0 for null and undefined', () => {
    expect(timestampToMillis(null)).toBe(0);
    expect(timestampToMillis(undefined)).toBe(0);
  });

  it('passes numbers through', () => {
    expect(timestampToMillis(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it('handles Date instances', () => {
    const d = new Date('2026-04-20T00:00:00Z');
    expect(timestampToMillis(d)).toBe(d.getTime());
  });

  it('parses ISO-8601 strings', () => {
    expect(timestampToMillis('2026-04-20T00:00:00Z')).toBe(
      Date.parse('2026-04-20T00:00:00Z'),
    );
  });

  it('returns 0 for unparseable strings', () => {
    expect(timestampToMillis('not-a-date')).toBe(0);
  });

  it('uses .toMillis() when present on an object (firebase-admin Timestamp instance)', () => {
    const fakeTimestamp = {
      seconds: 1_700_000_000,
      nanoseconds: 500_000_000,
      toMillis() {
        return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
      },
    };
    expect(timestampToMillis(fakeTimestamp)).toBe(1_700_000_000_500);
  });

  it('falls back to plain {seconds, nanoseconds} POJO when .toMillis is missing', () => {
    // This is the production bug that prompted this helper — the bundled
    // function runtime handed us a POJO without the Timestamp prototype.
    expect(timestampToMillis({ seconds: 1_700_000_000, nanoseconds: 500_000_000 })).toBe(
      1_700_000_000_500,
    );
  });

  it('also handles {_seconds, _nanoseconds} shape (some serializers)', () => {
    expect(timestampToMillis({ _seconds: 1_700_000_000, _nanoseconds: 0 })).toBe(
      1_700_000_000_000,
    );
  });

  it('zero nanoseconds is still a valid timestamp', () => {
    expect(timestampToMillis({ seconds: 100, nanoseconds: 0 })).toBe(100_000);
  });

  it('returns 0 for random objects', () => {
    expect(timestampToMillis({})).toBe(0);
    expect(timestampToMillis({ foo: 'bar' })).toBe(0);
  });
});
