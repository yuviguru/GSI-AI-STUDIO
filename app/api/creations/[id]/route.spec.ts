import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Creation } from '@/types/creation.types';

// ─── Mock dependencies ─────────────────────────────────

const mockGetCreation = vi.fn();
const mockIncrementView = vi.fn();

vi.mock('@/lib/firebase/creationService', () => ({
  getCreation: (...args: unknown[]) => mockGetCreation(...args),
  incrementView: (...args: unknown[]) => mockIncrementView(...args),
}));

vi.mock('next/server', () => ({
  NextRequest: class {
    private _url: string;
    private _headers: Map<string, string>;
    constructor(url: string, init?: { headers?: Record<string, string> }) {
      this._url = url;
      this._headers = new Map(Object.entries(init?.headers ?? {}));
    }
    get headers() {
      return { get: (key: string) => this._headers.get(key) ?? null };
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

// Import AFTER mocks
import { GET } from './route';
import { NextRequest } from 'next/server';

// ─── Helpers ────────────────────────────────────────────

function makeCreation(overrides: Partial<Creation> = {}): Creation {
  return {
    id: 'creation-1',
    type: 'story',
    title: 'A Test Story',
    status: 'published',
    prompt: 'Write a story',
    content: { pages: [], genre: 'adventure', characters: [], setting: 'space' },
    media: [],
    aiMetadata: { model: 'claude', concept: 'NLP', explanation: '', curriculumTag: '', aiPoints: 10 },
    sessionId: 'session-owner',
    viewCount: 0,
    shareCount: 0,
    likeCount: 0,
    aiConceptsTaught: ['prompt engineering'],
    curriculumTags: [],
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Creation;
}

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/creations/creation-1', { headers });
}

type ApiResponse = { body: { success: boolean; data: Record<string, unknown>; error?: { code: string } }; status: number };

// ─── Tests ──────────────────────────────────────────────

describe('GET /api/creations/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIncrementView.mockResolvedValue(undefined);
  });

  it('returns public creation without sessionId when requester is not the owner', async () => {
    mockGetCreation.mockResolvedValue(makeCreation());

    const res = (await GET(makeRequest({ 'X-Session-Id': 'other-session' }), {
      params: { id: 'creation-1' },
    })) as unknown as ApiResponse;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).not.toHaveProperty('sessionId');
    expect(res.body.data.title).toBe('A Test Story');
  });

  it('returns public creation without sessionId when no session header provided', async () => {
    mockGetCreation.mockResolvedValue(makeCreation());

    const res = (await GET(makeRequest(), {
      params: { id: 'creation-1' },
    })) as unknown as ApiResponse;

    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('sessionId');
  });

  it('returns public creation with sessionId when requester is the owner', async () => {
    mockGetCreation.mockResolvedValue(makeCreation());

    const res = (await GET(makeRequest({ 'X-Session-Id': 'session-owner' }), {
      params: { id: 'creation-1' },
    })) as unknown as ApiResponse;

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('sessionId', 'session-owner');
  });

  it('returns private creation to the owner', async () => {
    mockGetCreation.mockResolvedValue(makeCreation({ isPublic: false }));

    const res = (await GET(makeRequest({ 'X-Session-Id': 'session-owner' }), {
      params: { id: 'creation-1' },
    })) as unknown as ApiResponse;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for private creation when requester is not the owner', async () => {
    mockGetCreation.mockResolvedValue(makeCreation({ isPublic: false }));

    const res = (await GET(makeRequest({ 'X-Session-Id': 'other-session' }), {
      params: { id: 'creation-1' },
    })) as unknown as ApiResponse;

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  it('returns 404 for private creation when no session header', async () => {
    mockGetCreation.mockResolvedValue(makeCreation({ isPublic: false }));

    const res = (await GET(makeRequest(), {
      params: { id: 'creation-1' },
    })) as unknown as ApiResponse;

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('calls incrementView for the creation', async () => {
    mockGetCreation.mockResolvedValue(makeCreation());

    await GET(makeRequest({ 'X-Session-Id': 'session-owner' }), {
      params: { id: 'creation-1' },
    });

    expect(mockIncrementView).toHaveBeenCalledWith('creation-1');
  });

  it('returns 404 when creation does not exist', async () => {
    const { AppException } = await import('@/lib/api-utils');
    mockGetCreation.mockRejectedValue(new AppException('NOT_FOUND', 'Creation not found', 404));

    const res = (await GET(makeRequest(), {
      params: { id: 'nonexistent' },
    })) as unknown as ApiResponse;

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
