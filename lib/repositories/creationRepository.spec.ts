/**
 * Repository-level tests against the DataStore port (mocked).
 *
 * Replaces the legacy lib/firebase/creationService.spec.ts which mocked
 * adminDb directly; the implementation now goes through `backend.data`,
 * so these tests mock that and assert on its calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockQuery = vi.fn();
const mockIncrement = vi.fn();

vi.mock('@/lib/backend', () => ({
  backend: {
    data: {
      get: (coll: string, id: string) => mockGet(coll, id),
      create: (coll: string, id: string | null, data: unknown) => mockCreate(coll, id, data),
      update: (coll: string, id: string, partial: unknown) => mockUpdate(coll, id, partial),
      query: (coll: string, opts: unknown) => mockQuery(coll, opts),
      increment: (coll: string, id: string, field: string, by: number) =>
        mockIncrement(coll, id, field, by),
    },
  },
}));

import {
  saveCreation,
  getCreation,
  incrementView,
  incrementShare,
  archiveCreation,
  listCreations,
  listPublicCreations,
} from './creationRepository';

describe('creationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveCreation', () => {
    it('writes a new doc and returns id + share URL', async () => {
      mockCreate.mockResolvedValue('abc123');
      mockUpdate.mockResolvedValue(undefined);

      const result = await saveCreation({
        type: 'story',
        title: 'My Story',
        prompt: 'A robot in school',
        content: { pages: [] },
        aiMetadata: { model: 'test' },
        aiConceptsTaught: ['nlg'],
        sessionId: 's1',
      });

      expect(result).toEqual({ id: 'abc123', shareUrl: '/view/abc123' });
      expect(mockCreate).toHaveBeenCalledWith(
        'creations',
        null,
        expect.objectContaining({
          type: 'story',
          title: 'My Story',
          status: 'draft',
          isPublic: false,
        }),
      );
      // Then the second write to persist shareUrl.
      expect(mockUpdate).toHaveBeenCalledWith(
        'creations',
        'abc123',
        expect.objectContaining({ shareUrl: '/view/abc123' }),
      );
    });

    it('marks creation as published when isPublic=true', async () => {
      mockCreate.mockResolvedValue('id1');
      mockUpdate.mockResolvedValue(undefined);

      await saveCreation({
        type: 'quiz',
        title: 'Q',
        prompt: 'Math',
        content: {},
        aiMetadata: {},
        aiConceptsTaught: [],
        sessionId: 's1',
        isPublic: true,
      });

      expect(mockCreate.mock.calls[0]![2]).toMatchObject({
        status: 'published',
        isPublic: true,
      });
    });

    it('triggers remix counter increment when remixedFromId provided', async () => {
      mockCreate.mockResolvedValue('id2');
      mockUpdate.mockResolvedValue(undefined);
      mockIncrement.mockResolvedValue(undefined);

      await saveCreation({
        type: 'story',
        title: 'T',
        prompt: 'P',
        content: {},
        aiMetadata: {},
        aiConceptsTaught: [],
        sessionId: 's1',
        remixedFromId: 'parent42',
      });

      // increment is fire-and-forget; let the microtask queue drain
      await new Promise((r) => setTimeout(r, 0));
      expect(mockIncrement).toHaveBeenCalledWith('creations', 'parent42', 'remixCount', 1);
    });
  });

  describe('getCreation', () => {
    it('returns the document when found', async () => {
      mockGet.mockResolvedValue({ id: 'x', title: 'Hello', type: 'story' });
      const c = await getCreation('x');
      expect(c.title).toBe('Hello');
      expect(mockGet).toHaveBeenCalledWith('creations', 'x');
    });

    it('throws NOT_FOUND when missing', async () => {
      mockGet.mockResolvedValue(null);
      await expect(getCreation('nope')).rejects.toThrow(/not found/i);
    });
  });

  describe('incrementView', () => {
    it('checks existence, then increments viewCount', async () => {
      mockGet.mockResolvedValue({ id: 'v1', viewCount: 4 });
      mockIncrement.mockResolvedValue(undefined);
      await incrementView('v1');
      expect(mockIncrement).toHaveBeenCalledWith('creations', 'v1', 'viewCount', 1);
    });

    it('throws NOT_FOUND when creation is missing', async () => {
      mockGet.mockResolvedValue(null);
      await expect(incrementView('gone')).rejects.toThrow(/not found/i);
      expect(mockIncrement).not.toHaveBeenCalled();
    });
  });

  describe('incrementShare', () => {
    it('increments shareCount on existing creation', async () => {
      mockGet.mockResolvedValue({ id: 's1' });
      await incrementShare('s1');
      expect(mockIncrement).toHaveBeenCalledWith('creations', 's1', 'shareCount', 1);
    });
  });

  describe('archiveCreation', () => {
    it('archives when caller owns the creation', async () => {
      mockGet.mockResolvedValue({ id: 'a1', sessionId: 'mine' });
      await archiveCreation('a1', 'mine');
      expect(mockUpdate).toHaveBeenCalledWith(
        'creations',
        'a1',
        expect.objectContaining({ status: 'archived' }),
      );
    });

    it('throws FORBIDDEN when caller does not own the creation', async () => {
      mockGet.mockResolvedValue({ id: 'a1', sessionId: 'someone-else' });
      await expect(archiveCreation('a1', 'mine')).rejects.toThrow(/own/i);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('listCreations', () => {
    it('queries with status != archived in the where clause', async () => {
      mockQuery.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
      await listCreations('s1');
      expect(mockQuery).toHaveBeenCalledWith(
        'creations',
        expect.objectContaining({
          where: expect.arrayContaining([
            { field: 'sessionId', op: 'eq', value: 's1' },
            { field: 'status', op: 'ne', value: 'archived' },
          ]),
          orderBy: [{ field: 'createdAt', direction: 'desc' }],
        }),
      );
    });

    it('caps limit at MAX_PAGE_SIZE (50)', async () => {
      mockQuery.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
      await listCreations('s1', { limit: 1000 });
      const opts = mockQuery.mock.calls[0]![1] as { limit: number };
      expect(opts.limit).toBe(50);
    });

    it('forwards cursor to the data store unchanged (opaque)', async () => {
      mockQuery.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
      await listCreations('s1', { cursor: 'opaque-base64' });
      const opts = mockQuery.mock.calls[0]![1] as { cursor: string };
      expect(opts.cursor).toBe('opaque-base64');
    });

    it('passes through the data-store cursor on the way out', async () => {
      mockQuery.mockResolvedValue({
        items: [{ id: 'a' }],
        nextCursor: 'next-page-cursor',
        hasMore: true,
      });
      const result = await listCreations('s1');
      expect(result.nextCursor).toBe('next-page-cursor');
      expect(result.hasMore).toBe(true);
    });
  });

  describe('listPublicCreations', () => {
    it('uses likeCount + createdAt secondary sort for trending (no duplicate rows)', async () => {
      mockQuery.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
      await listPublicCreations({ sort: 'trending' });
      const opts = mockQuery.mock.calls[0]![1] as {
        orderBy: Array<{ field: string }>;
      };
      expect(opts.orderBy.map((o) => o.field)).toEqual(['likeCount', 'createdAt']);
    });

    it('uses createdAt only for newest sort', async () => {
      mockQuery.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
      await listPublicCreations({ sort: 'newest' });
      const opts = mockQuery.mock.calls[0]![1] as {
        orderBy: Array<{ field: string }>;
      };
      expect(opts.orderBy.map((o) => o.field)).toEqual(['createdAt']);
    });
  });
});
