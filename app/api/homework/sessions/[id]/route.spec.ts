import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import type { HomeworkSession } from '@/lib/bot/types';

// ─── Firestore admin mocks ─────────────────────────────────

const mockKidDoc = vi.fn();
const mockSessionDoc = vi.fn();

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'parent-a-token') return { uid: 'parent_a' };
      if (token === 'parent-b-token') return { uid: 'parent_b' };
      throw new Error('invalid token');
    }),
  },
  adminDb: {
    collection: vi.fn((name: string) => ({
      doc: vi.fn((id: string) => ({
        get: vi.fn(async () => {
          if (name === 'kids') return mockKidDoc(id);
          if (name === 'users') return { exists: true, data: () => ({ role: 'parent', plan: 'free' }) };
          if (name === 'homeworkSessions') return mockSessionDoc(id);
          return { exists: false, data: () => undefined };
        }),
      })),
    })),
  },
}));

// homeworkSessionStore is where getHomeworkSession reads the session doc.
vi.mock('@/lib/bot/services/homeworkSessionStore', () => ({
  getHomeworkSession: vi.fn(async (id: string) => {
    const res = mockSessionDoc(id);
    return res.exists ? res.data() : null;
  }),
}));

// ─── Helpers ──────────────────────────────────────────────

function buildSession(overrides: Partial<HomeworkSession> = {}): HomeworkSession {
  const now = Timestamp.now();
  return {
    id: 'hw_1',
    sessionId: 'chat_1',
    gsiSessionId: 'sess_anon_a',
    kidId: 'kid_a',
    platform: 'telegram',
    subject: 'Math',
    gradeEstimate: 5,
    language: 'en',
    originalText: 'q',
    totalQuestions: 1,
    questions: [
      {
        id: 1,
        text: 'What is 2 + 2?',
        type: 'short_answer',
        options: null,
        correctAnswer: '4',
        hint: 'Count!',
        recitationText: null,
        similarPractice: null,
      },
    ],
    progress: {
      currentIndex: 1,
      mode: 'quiz',
      startedAt: now,
      completedAt: now,
      answers: [
        {
          questionId: 1,
          answer: '4',
          correct: true,
          attempts: 1,
          score: 100,
          revealed: false,
        },
      ],
    },
    score: 100,
    revealedQuestionIds: [],
    schoolId: null,
    sourceChannelId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRequest(headers: Record<string, string>): {
  headers: Headers;
  // The actual route uses NextRequest; we stub the parts it reads.
} {
  const h = new Headers(headers);
  return { headers: h };
}

beforeEach(() => {
  mockKidDoc.mockReset();
  mockSessionDoc.mockReset();
});

// ─── Imports after mocks ───────────────────────────────────

import { GET } from './route';
import type { NextRequest } from 'next/server';

function asRequest(headers: Record<string, string>): NextRequest {
  return makeRequest(headers) as unknown as NextRequest;
}

// ─── Tests ────────────────────────────────────────────────

describe('GET /api/homework/sessions/:id', () => {
  it('returns 404 when the session does not exist', async () => {
    mockSessionDoc.mockReturnValue({ exists: false, data: () => undefined });
    const response = await GET(asRequest({ 'X-Session-Id': 'sess_anon_a' }), {
      params: { id: 'hw_missing' },
    });
    expect(response.status).toBe(404);
  });

  it('returns the transcript to the anonymous owner', async () => {
    const session = buildSession();
    mockSessionDoc.mockReturnValue({ exists: true, data: () => session });
    const response = await GET(asRequest({ 'X-Session-Id': 'sess_anon_a' }), {
      params: { id: 'hw_1' },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.subject).toBe('Math');
    expect(body.data.answers).toHaveLength(1);
  });

  it('forbids access from a different anonymous session', async () => {
    const session = buildSession();
    mockSessionDoc.mockReturnValue({ exists: true, data: () => session });
    const response = await GET(asRequest({ 'X-Session-Id': 'sess_other' }), {
      params: { id: 'hw_1' },
    });
    expect(response.status).toBe(403);
  });

  it('forbids authenticated access when the session belongs to another kid', async () => {
    const session = buildSession({ kidId: 'kid_a' });
    mockSessionDoc.mockReturnValue({ exists: true, data: () => session });
    mockKidDoc.mockReturnValue({
      exists: true,
      data: () => ({ parentId: 'parent_a' }),
    });
    const response = await GET(
      asRequest({
        Authorization: 'Bearer parent-b-token',
        'X-Active-Kid-Id': 'kid_b',
      }),
      { params: { id: 'hw_1' } },
    );
    expect(response.status).toBe(403);
  });

  it('allows authenticated access when the kid + parent both match', async () => {
    const session = buildSession({ kidId: 'kid_a' });
    mockSessionDoc.mockReturnValue({ exists: true, data: () => session });
    mockKidDoc.mockReturnValue({
      exists: true,
      data: () => ({ parentId: 'parent_a' }),
    });
    const response = await GET(
      asRequest({
        Authorization: 'Bearer parent-a-token',
        'X-Active-Kid-Id': 'kid_a',
      }),
      { params: { id: 'hw_1' } },
    );
    expect(response.status).toBe(200);
  });
});
