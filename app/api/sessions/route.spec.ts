import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock dependencies ─────────────────────────────────

const mockGetOrCreateSession = vi.fn();

vi.mock('@/lib/firebase/sessionService', () => ({
  getOrCreateSession: (...args: unknown[]) => mockGetOrCreateSession(...args),
}));

vi.mock('next/server', () => ({
  NextRequest: class {
    private body: string;
    constructor(url: string, init?: { method?: string; body?: string }) {
      this.body = init?.body ?? '{}';
      void url;
    }
    async json() {
      return JSON.parse(this.body);
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
import { POST } from './route';
import { NextRequest } from 'next/server';

// ─── Helpers ────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── Tests ──────────────────────────────────────────────

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session data for valid request', async () => {
    mockGetOrCreateSession.mockResolvedValue({
      sessionId: 'test-123',
      creationsRemaining: 5,
      cooldownSeconds: 0,
      expiresAt: '2026-01-01T00:00:00.000Z',
    });

    const res = (await POST(makeRequest({ sessionId: 'test-123' }))) as unknown as {
      body: { success: boolean; data: { sessionId: string } };
      status: number;
    };

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBe('test-123');
  });

  it('returns 400 for missing sessionId', async () => {
    const res = (await POST(makeRequest({}))) as unknown as {
      body: { success: boolean; error: { code: string } };
      status: number;
    };

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('passes fingerprint to service when provided', async () => {
    mockGetOrCreateSession.mockResolvedValue({
      sessionId: 'test-123',
      creationsRemaining: 5,
      cooldownSeconds: 0,
      expiresAt: '2026-01-01T00:00:00.000Z',
    });

    await POST(makeRequest({ sessionId: 'test-123', fingerprint: 'fp-abc' }));

    expect(mockGetOrCreateSession).toHaveBeenCalledWith('test-123', 'fp-abc');
  });

  it('handles service errors gracefully', async () => {
    mockGetOrCreateSession.mockRejectedValue(new Error('Firestore down'));

    const res = (await POST(makeRequest({ sessionId: 'test-123' }))) as unknown as {
      body: { success: boolean; error: { code: string } };
      status: number;
    };

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
