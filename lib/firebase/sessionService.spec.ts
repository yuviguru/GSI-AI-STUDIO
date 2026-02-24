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

vi.mock('./admin', () => ({
  adminDb: {
    collection: () => ({
      doc: () => mockDocRef,
    }),
  },
}));

// ─── Import after mocks ────────────────────────────────

import { getOrCreateSession, trackCreation, checkRateLimit } from './sessionService';

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
  });

  describe('getOrCreateSession', () => {
    it('creates a new session when none exists', async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await getOrCreateSession('new-session');

      expect(mockSet).toHaveBeenCalledOnce();
      expect(result.sessionId).toBe('new-session');
      expect(result.creationsRemaining).toBe(5);
      expect(result.cooldownSeconds).toBe(0);
      expect(result.expiresAt).toBeTruthy();
    });

    it('returns existing valid session', async () => {
      mockGet.mockResolvedValue(makeSessionDoc({ creationCount: 2 }));

      const result = await getOrCreateSession('test-session');

      expect(mockSet).not.toHaveBeenCalled();
      expect(result.creationsRemaining).toBe(3);
    });

    it('creates a fresh session when expired', async () => {
      mockGet.mockResolvedValue(makeExpiredSession());

      const result = await getOrCreateSession('expired-session');

      expect(mockSet).toHaveBeenCalledOnce();
      expect(result.creationsRemaining).toBe(5);
    });
  });

  describe('trackCreation', () => {
    it('increments creation count', async () => {
      mockGet.mockResolvedValue(makeSessionDoc({ creationCount: 2 }));

      const result = await trackCreation('test-session');

      expect(mockUpdate).toHaveBeenCalledOnce();
      expect(result.creationsRemaining).toBe(2); // 5 - 3
    });

    it('throws RATE_LIMITED when at max creations', async () => {
      mockGet.mockResolvedValue(makeSessionDoc({ creationCount: 5 }));

      await expect(trackCreation('test-session')).rejects.toThrow('Daily creation limit reached');
    });

    it('throws COOLDOWN when within 2-minute window', async () => {
      const recentMs = Date.now() - 30 * 1000; // 30 seconds ago
      mockGet.mockResolvedValue(
        makeSessionDoc({ lastCreationAt: Timestamp.fromMillis(recentMs) })
      );

      await expect(trackCreation('test-session')).rejects.toThrow('Please wait');
    });

    it('allows creation after cooldown period', async () => {
      const oldMs = Date.now() - 3 * 60 * 1000; // 3 minutes ago
      mockGet.mockResolvedValue(
        makeSessionDoc({
          creationCount: 1,
          lastCreationAt: Timestamp.fromMillis(oldMs),
        })
      );

      const result = await trackCreation('test-session');

      expect(mockUpdate).toHaveBeenCalledOnce();
      expect(result.creationsRemaining).toBe(3); // 5 - 2
    });

    it('throws SESSION_NOT_FOUND for missing session', async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(trackCreation('missing')).rejects.toThrow('Session not found');
    });

    it('throws SESSION_EXPIRED for expired session', async () => {
      mockGet.mockResolvedValue(makeExpiredSession());

      await expect(trackCreation('expired')).rejects.toThrow('Session has expired');
    });
  });

  describe('checkRateLimit', () => {
    it('returns ok for fresh session', async () => {
      mockGet.mockResolvedValue(makeSessionDoc());

      const result = await checkRateLimit('test-session');

      expect(result.creationsRemaining).toBe(5);
      expect(result.cooldownSeconds).toBe(0);
    });

    it('throws when rate limited', async () => {
      mockGet.mockResolvedValue(makeSessionDoc({ creationCount: 5 }));

      await expect(checkRateLimit('test-session')).rejects.toThrow('Daily creation limit reached');
    });

    it('throws when in cooldown', async () => {
      const recentMs = Date.now() - 60 * 1000; // 1 minute ago
      mockGet.mockResolvedValue(
        makeSessionDoc({ lastCreationAt: Timestamp.fromMillis(recentMs) })
      );

      await expect(checkRateLimit('test-session')).rejects.toThrow('Please wait');
    });

    it('reports cooldown seconds accurately', async () => {
      const recentMs = Date.now() - 60 * 1000; // 1 minute ago
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
});
