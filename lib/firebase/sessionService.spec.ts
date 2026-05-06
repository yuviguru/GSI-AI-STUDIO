import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

// ─── Mock Firebase Admin ────────────────────────────────

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();

const mockDocRef = {
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
};

// Transaction mock: tx.get(), tx.set(), and tx.update() for getOrCreateSession/trackCreation
const mockTxGet = vi.fn();
const mockTxSet = vi.fn();
const mockTxUpdate = vi.fn();
const mockRunTransaction = vi.fn(async (cb: (tx: { get: typeof mockTxGet; set: typeof mockTxSet; update: typeof mockTxUpdate }) => Promise<unknown>) => {
  return cb({ get: mockTxGet, set: mockTxSet, update: mockTxUpdate });
});

vi.mock('./admin', () => ({
  adminDb: {
    collection: () => ({
      doc: () => mockDocRef,
    }),
    runTransaction: (cb: Parameters<typeof mockRunTransaction>[0]) => mockRunTransaction(cb),
  },
}));

// ─── Import after mocks ────────────────────────────────

import { getOrCreateSession, trackCreation, checkRateLimit, updateKidPoints } from './sessionService';

// ─── Helpers ────────────────────────────────────────────

function makeSessionDoc(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    exists: true,
    data: () => ({
      id: 'test-session',
      fingerprint: null,
      creationCount: 0,
      lastCreationAt: null,
      ipHash: null,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + 24 * 60 * 60 * 1000),
      ...overrides,
    }),
  };
}

function makeExpiredSession() {
  const pastMs = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
  return makeSessionDoc({
    createdAt: Timestamp.fromMillis(pastMs),
    expiresAt: Timestamp.fromMillis(pastMs + 24 * 60 * 60 * 1000),
  });
}

// ─── Tests ──────────────────────────────────────────────

describe('sessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
    mockTxSet.mockReturnValue(undefined);
    mockTxUpdate.mockReturnValue(undefined);
  });

  describe('getOrCreateSession', () => {
    it('creates a new session when none exists', async () => {
      mockTxGet.mockResolvedValue({ exists: false });

      const result = await getOrCreateSession('new-session');

      expect(mockRunTransaction).toHaveBeenCalledOnce();
      expect(result.sessionId).toBe('new-session');
      // MAX_CREATIONS_PER_DAY bumped 10 → 25 to support Book Studio's
      // per-page AI calls. See sessionService.ts constants.
      expect(result.creationsRemaining).toBe(25);
      expect(result.cooldownSeconds).toBe(0);
      expect(result.expiresAt).toBeTruthy();
    });

    it('returns existing valid session', async () => {
      mockTxGet.mockResolvedValue(makeSessionDoc({ creationCount: 2 }));

      const result = await getOrCreateSession('test-session');

      expect(mockRunTransaction).toHaveBeenCalledOnce();
      expect(result.creationsRemaining).toBe(23); // 25 - 2
    });

    it('creates a fresh session when expired', async () => {
      mockTxGet.mockResolvedValue(makeExpiredSession());

      const result = await getOrCreateSession('expired-session');

      expect(mockRunTransaction).toHaveBeenCalledOnce();
      expect(result.creationsRemaining).toBe(25);
    });
  });

  describe('trackCreation', () => {
    it('increments creation count within a transaction', async () => {
      mockTxGet.mockResolvedValue(makeSessionDoc({ creationCount: 2 }));

      const result = await trackCreation('test-session');

      expect(mockRunTransaction).toHaveBeenCalledOnce();
      expect(mockTxUpdate).toHaveBeenCalledOnce();
      expect(result.creationsRemaining).toBe(22); // 25 - 3
    });

    it('throws RATE_LIMITED when at max creations', async () => {
      // At MAX_CREATIONS_PER_DAY (25) the next call throws.
      mockTxGet.mockResolvedValue(makeSessionDoc({ creationCount: 25 }));

      await expect(trackCreation('test-session')).rejects.toThrow('Daily creation limit reached');
    });

    it('throws COOLDOWN when within the cooldown window', async () => {
      // COOLDOWN_SECONDS dropped 120 → 10. 5s ago is well inside the new window.
      const recentMs = Date.now() - 5 * 1000;
      mockTxGet.mockResolvedValue(
        makeSessionDoc({ lastCreationAt: Timestamp.fromMillis(recentMs) })
      );

      await expect(trackCreation('test-session')).rejects.toThrow('Please wait');
    });

    it('allows creation after cooldown period', async () => {
      // 30s ago is well outside the 10s cooldown.
      const oldMs = Date.now() - 30 * 1000;
      mockTxGet.mockResolvedValue(
        makeSessionDoc({
          creationCount: 1,
          lastCreationAt: Timestamp.fromMillis(oldMs),
        })
      );

      const result = await trackCreation('test-session');

      expect(mockTxUpdate).toHaveBeenCalledOnce();
      expect(result.creationsRemaining).toBe(23); // 25 - 2
    });

    it('throws SESSION_NOT_FOUND for missing session', async () => {
      mockTxGet.mockResolvedValue({ exists: false });

      await expect(trackCreation('missing')).rejects.toThrow('Session not found');
    });

    it('throws SESSION_EXPIRED for expired session', async () => {
      mockTxGet.mockResolvedValue(makeExpiredSession());

      await expect(trackCreation('expired')).rejects.toThrow('Session has expired');
    });
  });

  describe('checkRateLimit', () => {
    it('returns ok for fresh session', async () => {
      mockGet.mockResolvedValue(makeSessionDoc());

      const result = await checkRateLimit('test-session');

      expect(result.creationsRemaining).toBe(25);
      expect(result.cooldownSeconds).toBe(0);
    });

    it('throws when rate limited', async () => {
      mockGet.mockResolvedValue(makeSessionDoc({ creationCount: 25 }));

      await expect(checkRateLimit('test-session')).rejects.toThrow('Daily creation limit reached');
    });

    it('throws when in cooldown', async () => {
      // 5s ago is inside the 10s cooldown window.
      const recentMs = Date.now() - 5 * 1000;
      mockGet.mockResolvedValue(
        makeSessionDoc({ lastCreationAt: Timestamp.fromMillis(recentMs) })
      );

      await expect(checkRateLimit('test-session')).rejects.toThrow('Please wait');
    });

    it('reports cooldown seconds accurately', async () => {
      const recentMs = Date.now() - 5 * 1000; // 5s ago — inside the 10s cooldown
      mockGet.mockResolvedValue(
        makeSessionDoc({
          creationCount: 1,
          lastCreationAt: Timestamp.fromMillis(recentMs),
        })
      );

      // checkRateLimit throws for cooldown, so we catch and verify the error
      try {
        await checkRateLimit('test-session');
        expect.fail('Should have thrown');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).toMatch(/wait \d+ seconds/);
      }
    });
  });

  describe('updateKidPoints', () => {
    /** Helper — stub a `kids/{kidId}` read inside the transaction mock. */
    function makeKidDoc(data: Record<string, unknown>) {
      return {
        exists: true,
        data: () => data,
      };
    }

    it('adds points to the kid document', async () => {
      mockTxGet.mockResolvedValue(
        makeKidDoc({ aiPoints: 30, badges: [], conceptsLearned: [], creationsByType: {}, shareCount: 0 }),
      );

      const result = await updateKidPoints('kid-1', { action: 'add_points', points: 15 });

      expect(mockTxSet).toHaveBeenCalledOnce();
      // Merge-set goes to kids/{kidId}, not the session collection.
      const writtenPayload = mockTxSet.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(writtenPayload.aiPoints).toBe(45);
      expect(writtenPayload.totalCreations).toBe(0);
      expect(result.data.aiPoints).toBe(45);
    });

    it('does not touch sessions collection — writes only to kids/{kidId}', async () => {
      mockTxGet.mockResolvedValue(
        makeKidDoc({ aiPoints: 0, badges: [], conceptsLearned: [], creationsByType: {}, shareCount: 0 }),
      );

      await updateKidPoints('kid-2', { action: 'add_points', points: 5 });

      // Only one tx.set call — the kid doc. Would be two if we were
      // accidentally dual-writing to sessions.
      expect(mockTxSet).toHaveBeenCalledOnce();
    });

    it('tracks creations and recomputes totalCreations', async () => {
      mockTxGet.mockResolvedValue(
        makeKidDoc({
          aiPoints: 0,
          badges: [],
          conceptsLearned: [],
          creationsByType: { story: 2, music: 1 },
          shareCount: 0,
        }),
      );

      await updateKidPoints('kid-3', { action: 'track_creation', creationType: 'story' });

      const writtenPayload = mockTxSet.mock.calls[0]?.[1] as Record<string, unknown>;
      const creationsByType = writtenPayload.creationsByType as Record<string, number>;
      expect(creationsByType.story).toBe(3);
      expect(creationsByType.music).toBe(1);
      expect(writtenPayload.totalCreations).toBe(4); // 3 + 1
    });

    it('adds a learned concept without duplicating', async () => {
      mockTxGet.mockResolvedValue(
        makeKidDoc({
          aiPoints: 0,
          badges: [],
          conceptsLearned: ['prompts'],
          creationsByType: {},
          shareCount: 0,
        }),
      );

      await updateKidPoints('kid-4', { action: 'learn_concept', concept: 'prompts' });

      const writtenPayload = mockTxSet.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(writtenPayload.conceptsLearned).toEqual(['prompts']);
    });

    it('throws NOT_FOUND when kid document does not exist', async () => {
      mockTxGet.mockResolvedValue({ exists: false });

      await expect(
        updateKidPoints('missing-kid', { action: 'add_points', points: 10 }),
      ).rejects.toThrow('Kid profile not found');
    });

    it('unlocks newly-earned badges', async () => {
      // Kid at 45 points, about to hit the 50-points threshold (if that badge exists).
      mockTxGet.mockResolvedValue(
        makeKidDoc({
          aiPoints: 45,
          badges: [],
          conceptsLearned: [],
          creationsByType: {},
          shareCount: 0,
        }),
      );

      const result = await updateKidPoints('kid-5', { action: 'add_points', points: 10 });

      // Don't assert the exact badge ids (that's the badge catalog's business)
      // — just assert the newBadges array is wired through.
      expect(Array.isArray(result.newBadges)).toBe(true);
      expect(result.data.aiPoints).toBe(55);
    });

    it('increments shareCount on track_share', async () => {
      mockTxGet.mockResolvedValue(
        makeKidDoc({
          aiPoints: 0,
          badges: [],
          conceptsLearned: [],
          creationsByType: {},
          shareCount: 2,
        }),
      );

      await updateKidPoints('kid-6', { action: 'track_share' });

      const writtenPayload = mockTxSet.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(writtenPayload.shareCount).toBe(3);
    });
  });
});
