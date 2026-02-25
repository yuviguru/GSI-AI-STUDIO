import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// ─── Mock Firebase Admin ────────────────────────────────

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockQueryGet = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();

// Build a chainable query mock
function buildQueryChain() {
  mockWhere.mockReturnThis();
  mockOrderBy.mockReturnThis();
  mockLimit.mockReturnThis();
  mockStartAfter.mockReturnThis();
  return {
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    startAfter: mockStartAfter,
    get: mockQueryGet,
  };
}

const mockDocRef = {
  id: 'auto-generated-id',
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
};

const queryChain = buildQueryChain();

vi.mock('./admin', () => ({
  adminDb: {
    collection: () => ({
      doc: (id?: string) => {
        if (id) return { ...mockDocRef, id };
        return mockDocRef;
      },
      where: queryChain.where,
      orderBy: queryChain.orderBy,
      limit: queryChain.limit,
      startAfter: queryChain.startAfter,
      get: mockQueryGet,
    }),
  },
}));

// ─── Import after mocks ────────────────────────────────

import {
  saveCreation,
  getCreation,
  listCreations,
  incrementView,
  incrementShare,
} from './creationService';

// ─── Helpers ────────────────────────────────────────────

const now = Date.now();

function makeCreationDoc(overrides: Record<string, unknown> = {}) {
  return {
    exists: true,
    id: 'test-creation-id',
    data: () => ({
      id: 'test-creation-id',
      type: 'story',
      title: 'Test Story',
      status: 'published',
      prompt: 'A cat in space',
      content: { pages: [{ text: 'Page 1', imageUrl: '', pageNumber: 1 }] },
      media: [],
      thumbnail: null,
      aiMetadata: { model: 'claude-sonnet', concept: 'nlg' },
      sessionId: 'session-123',
      userId: null,
      kidId: null,
      shareUrl: '/view/test-creation-id',
      viewCount: 5,
      shareCount: 2,
      likeCount: 0,
      aiConceptsTaught: ['nlg'],
      curriculumTags: ['ai_basics'],
      isPublic: true,
      createdAt: Timestamp.fromMillis(now),
      updatedAt: Timestamp.fromMillis(now),
      ...overrides,
    }),
  };
}

const validSaveInput = {
  type: 'story' as const,
  title: 'My Space Cat Story',
  prompt: 'A cat who goes to space',
  content: { pages: [{ text: 'Once upon a time...', imageUrl: '', pageNumber: 1 }] },
  aiMetadata: { model: 'claude-sonnet', concept: 'nlg' },
  aiConceptsTaught: ['nlg', 'prompt_engineering'],
  sessionId: 'session-123',
};

// ─── Tests ──────────────────────────────────────────────

describe('creationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
    // Reset query chain
    buildQueryChain();
  });

  describe('saveCreation', () => {
    it('saves a creation and returns id + shareUrl', async () => {
      const result = await saveCreation(validSaveInput);

      expect(mockSet).toHaveBeenCalledOnce();
      expect(result.id).toBe('auto-generated-id');
      expect(result.shareUrl).toBe('/view/auto-generated-id');
    });

    it('saves with correct fields', async () => {
      await saveCreation(validSaveInput);

      const savedDoc = mockSet.mock.calls[0]![0];
      expect(savedDoc.type).toBe('story');
      expect(savedDoc.title).toBe('My Space Cat Story');
      expect(savedDoc.prompt).toBe('A cat who goes to space');
      expect(savedDoc.sessionId).toBe('session-123');
      expect(savedDoc.status).toBe('published');
      expect(savedDoc.viewCount).toBe(0);
      expect(savedDoc.shareCount).toBe(0);
      expect(savedDoc.likeCount).toBe(0);
      expect(savedDoc.isPublic).toBe(true);
      expect(savedDoc.aiConceptsTaught).toEqual(['nlg', 'prompt_engineering']);
    });

    it('defaults isPublic to true', async () => {
      await saveCreation(validSaveInput);

      const savedDoc = mockSet.mock.calls[0]![0];
      expect(savedDoc.isPublic).toBe(true);
    });

    it('allows setting isPublic to false', async () => {
      await saveCreation({ ...validSaveInput, isPublic: false });

      const savedDoc = mockSet.mock.calls[0]![0];
      expect(savedDoc.isPublic).toBe(false);
    });

    it('saves media and thumbnail when provided', async () => {
      await saveCreation({
        ...validSaveInput,
        media: [{ url: 'https://img.example.com/1.png', type: 'image', alt: 'Page 1' }],
        thumbnail: 'https://img.example.com/thumb.png',
      });

      const savedDoc = mockSet.mock.calls[0]![0];
      expect(savedDoc.media).toHaveLength(1);
      expect(savedDoc.thumbnail).toBe('https://img.example.com/thumb.png');
    });
  });

  describe('getCreation', () => {
    it('returns a creation when found', async () => {
      mockGet.mockResolvedValue(makeCreationDoc());

      const creation = await getCreation('test-creation-id');

      expect(creation.id).toBe('test-creation-id');
      expect(creation.type).toBe('story');
      expect(creation.title).toBe('Test Story');
      expect(creation.viewCount).toBe(5);
    });

    it('throws NOT_FOUND for missing creation', async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(getCreation('nonexistent')).rejects.toThrow('Creation not found');
    });

    it('converts Firestore timestamps to Date objects', async () => {
      mockGet.mockResolvedValue(makeCreationDoc());

      const creation = await getCreation('test-creation-id');

      expect(creation.createdAt).toBeInstanceOf(Date);
      expect(creation.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('listCreations', () => {
    it('returns empty list when no creations', async () => {
      mockQueryGet.mockResolvedValue({ docs: [] });

      const result = await listCreations('session-123');

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('returns creations for a session', async () => {
      mockQueryGet.mockResolvedValue({
        docs: [makeCreationDoc(), makeCreationDoc({ title: 'Story 2' })],
      });

      const result = await listCreations('session-123');

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('detects hasMore when extra doc is returned', async () => {
      // Simulate limit+1 docs returned (default limit=20, so 21 docs means hasMore)
      const docs = Array.from({ length: 21 }, (_, i) =>
        makeCreationDoc({ title: `Story ${i}` })
      );
      mockQueryGet.mockResolvedValue({ docs });

      const result = await listCreations('session-123');

      expect(result.items).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeTruthy();
    });

    it('applies type filter', async () => {
      mockQueryGet.mockResolvedValue({ docs: [] });

      await listCreations('session-123', { type: 'music' });

      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'music');
    });

    it('applies cursor pagination', async () => {
      // Mock the cursor doc lookup
      mockGet.mockResolvedValue({ exists: true });
      mockQueryGet.mockResolvedValue({ docs: [] });

      await listCreations('session-123', { cursor: 'cursor-doc-id' });

      expect(mockStartAfter).toHaveBeenCalled();
    });

    it('respects custom limit', async () => {
      mockQueryGet.mockResolvedValue({ docs: [] });

      await listCreations('session-123', { limit: 5 });

      // limit + 1 for hasMore detection
      expect(mockLimit).toHaveBeenCalledWith(6);
    });

    it('rejects cursor containing slash', async () => {
      await expect(listCreations('session-123', { cursor: 'a/b' })).rejects.toThrow('Invalid cursor');
    });

    it('caps limit at 50', async () => {
      mockQueryGet.mockResolvedValue({ docs: [] });

      await listCreations('session-123', { limit: 100 });

      // Should cap at 50 + 1 = 51
      expect(mockLimit).toHaveBeenCalledWith(51);
    });
  });

  describe('incrementView', () => {
    it('increments view count for existing creation', async () => {
      mockGet.mockResolvedValue({ exists: true });

      await incrementView('test-creation-id');

      expect(mockUpdate).toHaveBeenCalledOnce();
      const updateArgs = mockUpdate.mock.calls[0]![0];
      expect(updateArgs.viewCount).toBeDefined();
      expect(updateArgs.updatedAt).toBeDefined();
    });

    it('throws NOT_FOUND for missing creation', async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(incrementView('nonexistent')).rejects.toThrow('Creation not found');
    });
  });

  describe('incrementShare', () => {
    it('increments share count for existing creation', async () => {
      mockGet.mockResolvedValue({ exists: true });

      await incrementShare('test-creation-id');

      expect(mockUpdate).toHaveBeenCalledOnce();
      const updateArgs = mockUpdate.mock.calls[0]![0];
      expect(updateArgs.shareCount).toBeDefined();
      expect(updateArgs.updatedAt).toBeDefined();
    });

    it('throws NOT_FOUND for missing creation', async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(incrementShare('nonexistent')).rejects.toThrow('Creation not found');
    });
  });
});
