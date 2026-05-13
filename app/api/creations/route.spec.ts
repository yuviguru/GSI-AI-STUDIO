import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock dependencies ─────────────────────────────────

const mockCheckRateLimit = vi.fn();
const mockTrackCreation = vi.fn();
const mockSaveCreation = vi.fn();
const mockListCreations = vi.fn();

vi.mock('@gsi/firebase/sessionService', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  trackCreation: (...args: unknown[]) => mockTrackCreation(...args),
}));

vi.mock('@gsi/firebase/creationService', () => ({
  saveCreation: (...args: unknown[]) => mockSaveCreation(...args),
  listCreations: (...args: unknown[]) => mockListCreations(...args),
}));

vi.mock('next/server', () => ({
  NextRequest: class {
    private _body: string;
    private _url: string;
    private _headers: Map<string, string>;
    constructor(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
      this._body = init?.body ?? '{}';
      this._url = url;
      this._headers = new Map(Object.entries(init?.headers ?? {}));
    }
    async json() {
      return JSON.parse(this._body);
    }
    get headers() {
      return { get: (key: string) => this._headers.get(key) ?? null };
    }
    get url() {
      return this._url;
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
import { POST, GET } from './route';
import { NextRequest } from 'next/server';

// ─── Helpers ────────────────────────────────────────────

const validCreationBody = {
  type: 'story',
  title: 'My Story',
  prompt: 'A cat in space',
  content: { pages: [] },
  aiMetadata: { model: 'claude' },
  aiConceptsTaught: ['prompt engineering'],
};

function makePostRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/creations', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
}

function makeGetRequest(query = '', headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000/api/creations${query}`, {
    headers,
  });
}

type ApiResponse = { body: { success: boolean; data: Record<string, unknown>; error?: { code: string } }; status: number };

// ─── Tests ──────────────────────────────────────────────

describe('POST /api/creations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({});
    mockTrackCreation.mockResolvedValue({});
    mockSaveCreation.mockResolvedValue({ id: 'new-id', shareUrl: '/view/new-id' });
  });

  it('saves a creation and returns 201', async () => {
    const res = (await POST(makePostRequest(validCreationBody, { 'X-Session-Id': 'sess-1' }))) as unknown as ApiResponse;

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.creationId).toBe('new-id');
    expect(res.body.data.shareUrl).toBe('/view/new-id');
  });

  it('returns 401 when X-Session-Id header is missing', async () => {
    const res = (await POST(makePostRequest(validCreationBody))) as unknown as ApiResponse;

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('UNAUTHORIZED');
  });

  it('calls checkRateLimit and trackCreation with session ID', async () => {
    await POST(makePostRequest(validCreationBody, { 'X-Session-Id': 'sess-1' }));

    expect(mockCheckRateLimit).toHaveBeenCalledWith('sess-1');
    expect(mockTrackCreation).toHaveBeenCalledWith('sess-1');
  });

  it('passes validated prompt to saveCreation', async () => {
    await POST(makePostRequest(validCreationBody, { 'X-Session-Id': 'sess-1' }));

    expect(mockSaveCreation).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'A cat in space' })
    );
  });

  it('defaults prompt to empty string when omitted', async () => {
    const { prompt: _, ...bodyWithoutPrompt } = validCreationBody;
    await POST(makePostRequest(bodyWithoutPrompt, { 'X-Session-Id': 'sess-1' }));

    expect(mockSaveCreation).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: '' })
    );
  });

  it('returns rate limit error from checkRateLimit', async () => {
    const { AppException } = await import('@/lib/api-utils');
    mockCheckRateLimit.mockRejectedValue(new AppException('RATE_LIMITED', 'Daily limit reached', 429));

    const res = (await POST(makePostRequest(validCreationBody, { 'X-Session-Id': 'sess-1' }))) as unknown as ApiResponse;

    expect(res.status).toBe(429);
    expect(res.body.error?.code).toBe('RATE_LIMITED');
    expect(mockSaveCreation).not.toHaveBeenCalled();
  });

  it('returns error for invalid body', async () => {
    const res = (await POST(makePostRequest({ type: 'invalid' }, { 'X-Session-Id': 'sess-1' }))) as unknown as ApiResponse;

    expect(res.body.success).toBe(false);
    expect(mockSaveCreation).not.toHaveBeenCalled();
  });
});

describe('GET /api/creations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCreations.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
  });

  it('returns creations list for valid session', async () => {
    const res = (await GET(makeGetRequest('', { 'X-Session-Id': 'sess-1' }))) as unknown as ApiResponse;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockListCreations).toHaveBeenCalledWith('sess-1', {
      type: undefined,
      cursor: undefined,
      limit: undefined,
    });
  });

  it('returns 401 when X-Session-Id header is missing', async () => {
    const res = (await GET(makeGetRequest())) as unknown as ApiResponse;

    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('UNAUTHORIZED');
  });

  it('passes type filter to listCreations', async () => {
    await GET(makeGetRequest('?type=story', { 'X-Session-Id': 'sess-1' }));

    expect(mockListCreations).toHaveBeenCalledWith('sess-1', expect.objectContaining({ type: 'story' }));
  });

  it('passes cursor and limit to listCreations', async () => {
    await GET(makeGetRequest('?cursor=abc&limit=10', { 'X-Session-Id': 'sess-1' }));

    expect(mockListCreations).toHaveBeenCalledWith('sess-1', expect.objectContaining({
      cursor: 'abc',
      limit: 10,
    }));
  });
});
