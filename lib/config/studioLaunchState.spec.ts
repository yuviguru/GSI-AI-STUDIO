import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @gsi/firebase BEFORE importing the module under test so the
// `adminDb` reference resolves to our spy instead of a real Firestore
// client (the test env has no Firebase credentials and we don't want
// the test to actually hit the network).
const getMock = vi.fn();
vi.mock('@gsi/firebase', () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({ get: getMock }),
    }),
  },
}));

import { getStudioLaunchStates, mergeStudioOverrides } from './studioLaunchState';

describe('lib/config/studioLaunchState', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  describe('mergeStudioOverrides', () => {
    it('returns pure defaults when override is null/undefined/empty', () => {
      const a = mergeStudioOverrides(null);
      const b = mergeStudioOverrides(undefined);
      const c = mergeStudioOverrides({});
      expect(a.book.launchState).toBe('live');
      expect(a.story.launchState).toBe('beta');
      expect(b).toEqual(a);
      expect(c).toEqual(a);
    });

    it('applies a single per-studio launchState override', () => {
      const merged = mergeStudioOverrides({
        story: { launchState: 'live' },
      });
      expect(merged.story.launchState).toBe('live');
      // Other studios still default
      expect(merged.book.launchState).toBe('live');
      expect(merged.music.launchState).toBe('beta');
    });

    it('preserves the default label when override omits it', () => {
      const merged = mergeStudioOverrides({
        story: { launchState: 'live' },
      });
      expect(merged.story.label).toBe('Story Studio'); // default label
    });

    it('respects label overrides', () => {
      const merged = mergeStudioOverrides({
        music: { launchState: 'live', label: 'Sound Studio' },
      });
      expect(merged.music.label).toBe('Sound Studio');
      expect(merged.music.launchState).toBe('live');
    });

    it('coerces unknown launchState values to "beta"', () => {
      const merged = mergeStudioOverrides({
        comic: { launchState: 'gibberish' },
      });
      expect(merged.comic.launchState).toBe('beta');
    });

    it('ignores unknown studio ids without throwing', () => {
      // Future studios or typos shouldn't poison the resolved map.
      const merged = mergeStudioOverrides({
        ghostStudio: { launchState: 'live' },
      });
      // No ghostStudio key, all known studios still resolve to defaults
      expect((merged as Record<string, unknown>).ghostStudio).toBeUndefined();
      expect(merged.book.launchState).toBe('live');
    });

    it('rejects non-object entries safely', () => {
      const merged = mergeStudioOverrides({
        story: 'not an object',
        music: 42,
      } as unknown as Record<string, unknown>);
      // Both fall back to defaults instead of crashing
      expect(merged.story.launchState).toBe('beta');
      expect(merged.music.launchState).toBe('beta');
    });
  });

  describe('getStudioLaunchStates', () => {
    it('returns defaults when the Firestore doc does not exist', async () => {
      getMock.mockResolvedValueOnce({ exists: false, data: () => undefined });
      const config = await getStudioLaunchStates();
      expect(config.studios.book.launchState).toBe('live');
      expect(config.studios.story.launchState).toBe('beta');
    });

    it('returns defaults when the doc exists but has no `studios` map', async () => {
      getMock.mockResolvedValueOnce({
        exists: true,
        data: () => ({ updatedAt: '2026-05-27T00:00:00Z' }),
      });
      const config = await getStudioLaunchStates();
      expect(config.studios.book.launchState).toBe('live');
      expect(config.studios.story.launchState).toBe('beta');
    });

    it('applies Firestore overrides on top of defaults', async () => {
      getMock.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          studios: {
            story: { launchState: 'live' },
            game: { launchState: 'coming-soon' },
          },
        }),
      });
      const config = await getStudioLaunchStates();
      expect(config.studios.story.launchState).toBe('live');
      expect(config.studios.game.launchState).toBe('coming-soon');
      // Other studios still at defaults
      expect(config.studios.book.launchState).toBe('live');
      expect(config.studios.music.launchState).toBe('beta');
    });

    it('falls back to defaults when Firestore throws', async () => {
      // Firestore outage path — never propagate the error to callers,
      // because /api/config/studios is depended on by every studio
      // surface and a 500 here would break the whole hub render.
      getMock.mockRejectedValueOnce(new Error('Firestore unreachable'));
      const config = await getStudioLaunchStates();
      expect(config.studios.book.launchState).toBe('live');
      expect(config.studios.story.launchState).toBe('beta');
    });
  });
});
