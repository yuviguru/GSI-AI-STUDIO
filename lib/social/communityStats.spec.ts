import { describe, it, expect, vi, beforeEach } from 'vitest';

const countMock = vi.fn();
vi.mock('@gsi/firebase', () => ({
  adminDb: {
    collection: (_name: string) => ({
      where: (..._args: unknown[]) => ({
        count: () => ({ get: () => Promise.resolve({ data: () => ({ count: countMock() }) }) }),
      }),
      count: () => ({ get: () => Promise.resolve({ data: () => ({ count: countMock() }) }) }),
    }),
  },
}));

import { getCommunityStats, __resetCacheForTests } from './communityStats';
import {
  getSyntheticOnlineCount,
  __internals,
} from './onlineCounter';

describe('lib/social/onlineCounter — getSyntheticOnlineCount', () => {
  it('is refresh-stable within the same 5-min bucket', () => {
    const at1 = new Date('2026-05-28T18:32:10Z');
    const at2 = new Date('2026-05-28T18:34:59Z');
    expect(getSyntheticOnlineCount('global', at1)).toBe(getSyntheticOnlineCount('global', at2));
  });

  it('shifts across 5-min boundaries but not drastically', () => {
    const inBucket = new Date('2026-05-28T18:33:00Z');
    const nextBucket = new Date('2026-05-28T18:36:00Z');
    const a = getSyntheticOnlineCount('global', inBucket);
    const b = getSyntheticOnlineCount('global', nextBucket);
    expect(a).not.toBe(b); // bucket changed → noise changed
    const drift = Math.abs(a - b) / a;
    expect(drift).toBeLessThan(0.15); // < 15% change between adjacent buckets
  });

  it('IST evening peak (18-21) is meaningfully higher than overnight (0-5)', () => {
    // 18:00 IST = 12:30 UTC
    const evening = new Date('2026-05-28T12:30:00Z');
    // 03:00 IST = 21:30 UTC previous day
    const overnight = new Date('2026-05-27T21:30:00Z');
    expect(getSyntheticOnlineCount('global', evening)).toBeGreaterThan(
      getSyntheticOnlineCount('global', overnight) * 3,
    );
  });

  it('per-studio scopes sum to roughly the global baseline', () => {
    const at = new Date('2026-05-28T12:30:00Z'); // 18:00 IST peak
    const global = getSyntheticOnlineCount('global', at);
    const sum =
      getSyntheticOnlineCount('book', at) +
      getSyntheticOnlineCount('story', at) +
      getSyntheticOnlineCount('music', at) +
      getSyntheticOnlineCount('quiz', at) +
      getSyntheticOnlineCount('comic', at) +
      getSyntheticOnlineCount('game', at);
    // Sum will diverge from global by per-scope noise, but the ratio should
    // be inside ±15% of unity (each scope has its own independent noise).
    expect(sum / global).toBeGreaterThan(0.85);
    expect(sum / global).toBeLessThan(1.15);
  });

  it('different scopes produce different noise (not in lockstep)', () => {
    const at = new Date('2026-05-28T18:35:00Z');
    const bookNoise = __internals.smoothNoise(__internals.toFiveMinBucketIso(at), 'book');
    const storyNoise = __internals.smoothNoise(__internals.toFiveMinBucketIso(at), 'story');
    expect(bookNoise).not.toBe(storyNoise);
  });

  it('per-studio counts never collapse to zero', () => {
    // Even at 3am overnight low, per-studio count should be >= 1
    const overnight = new Date('2026-05-27T21:30:00Z');
    expect(getSyntheticOnlineCount('book', overnight)).toBeGreaterThanOrEqual(1);
  });
});

describe('lib/social/communityStats — getCommunityStats', () => {
  beforeEach(() => {
    countMock.mockReset();
    __resetCacheForTests();
  });

  it('returns combined creations + books for the global scope', async () => {
    countMock.mockReturnValueOnce(847).mockReturnValueOnce(123);
    const stats = await getCommunityStats('global');
    expect(stats.creationsLifetime).toBe(970);
    expect(stats.scope).toBe('global');
    expect(stats.onlineNow).toBeGreaterThan(0);
    expect(stats.onlineIsSynthetic).toBe(true);
  });

  it('returns only books count for the book scope', async () => {
    countMock.mockReturnValueOnce(123);
    const stats = await getCommunityStats('book');
    expect(stats.creationsLifetime).toBe(123);
  });

  it('returns filtered creations for a non-book studio scope', async () => {
    countMock.mockReturnValueOnce(57);
    const stats = await getCommunityStats('story');
    expect(stats.creationsLifetime).toBe(57);
  });

  it('caches per-source counts (2nd call within TTL hits 0 Firestore reads)', async () => {
    countMock.mockReturnValueOnce(10);
    await getCommunityStats('story'); // first → populates cache
    countMock.mockClear();
    await getCommunityStats('story'); // second → served from cache
    expect(countMock).not.toHaveBeenCalled();
  });

  it('survives a Firestore failure by serving last known value or 0', async () => {
    countMock.mockImplementationOnce(() => {
      throw new Error('Firestore unreachable');
    });
    const stats = await getCommunityStats('comic');
    expect(stats.creationsLifetime).toBe(0);
    expect(stats.onlineNow).toBeGreaterThan(0); // synthetic still works
  });
});
