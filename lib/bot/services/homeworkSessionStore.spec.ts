import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

// ─── Mock Firestore admin ────────────────────────────────────

const docStore = new Map<string, unknown>();

const makeDocRef = (id: string) => ({
  id,
  get: vi.fn(async () => {
    const data = docStore.get(id);
    return {
      exists: data !== undefined,
      data: () => data,
    };
  }),
  set: vi.fn(async (value: unknown) => {
    docStore.set(id, value);
  }),
});

const mockCollectionDoc = vi.fn((id: string) => makeDocRef(id));

vi.mock('@gsi/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({ doc: mockCollectionDoc })),
    runTransaction: vi.fn(
      async (
        cb: (tx: {
          get: (ref: { id: string }) => Promise<{ exists: boolean; data: () => unknown }>;
          set: (ref: { id: string }, value: unknown) => void;
        }) => Promise<unknown>,
      ) =>
        cb({
          get: async (ref) => {
            const data = docStore.get(ref.id);
            return {
              exists: data !== undefined,
              data: () => data,
            };
          },
          set: (ref, value) => {
            docStore.set(ref.id, value);
          },
        }),
    ),
  },
}));

// ─── Imports after mocks ────────────────────────────────────

import {
  createHomeworkSession,
  recordAnswer,
  getHomeworkSession,
} from './homeworkSessionStore';
import type { HomeworkQuestion } from '@/lib/bot/types';

// ─── Helpers ────────────────────────────────────────────────

function makeQuestion(overrides: Partial<HomeworkQuestion> = {}): HomeworkQuestion {
  return {
    id: 1,
    text: 'What is 2 + 2?',
    type: 'multiple_choice',
    options: ['3', '4', '5'],
    correctAnswer: '4',
    hint: 'Count on your fingers.',
    recitationText: null,
    similarPractice: 'What is 3 + 3?',
    ...overrides,
  };
}

beforeEach(() => {
  docStore.clear();
  mockCollectionDoc.mockClear();
});

// ─── Tests ──────────────────────────────────────────────────

describe('createHomeworkSession', () => {
  it('persists a new session with empty progress', async () => {
    const session = await createHomeworkSession({
      sessionId: 'chat_1',
      gsiSessionId: 'sess_1',
      kidId: null,
      platform: 'telegram',
      subject: 'Math',
      gradeEstimate: 5,
      language: 'en',
      originalText: 'What is 2 + 2?',
      questions: [makeQuestion()],
      mode: 'quiz',
    });
    expect(session.id).toMatch(/^hw_/);
    expect(session.totalQuestions).toBe(1);
    expect(session.progress.currentIndex).toBe(0);
    expect(session.progress.answers).toEqual([]);
    expect(session.revealedQuestionIds).toEqual([]);
    expect(session.score).toBe(0);
    expect(session.schoolId).toBeNull();
  });

  it('rejects empty question arrays', async () => {
    await expect(
      createHomeworkSession({
        sessionId: 'chat_1',
        gsiSessionId: 'sess_1',
        kidId: null,
        platform: 'telegram',
        subject: 'Math',
        gradeEstimate: 5,
        language: 'en',
        originalText: 'blah',
        questions: [],
        mode: 'quiz',
      }),
    ).rejects.toThrow(/No questions/i);
  });

  it('carries through schoolId and sourceChannelId when provided', async () => {
    const session = await createHomeworkSession({
      sessionId: 'chat_1',
      gsiSessionId: 'sess_1',
      kidId: 'kid_7',
      platform: 'telegram',
      subject: 'English',
      gradeEstimate: 4,
      language: 'en',
      originalText: 'Read the poem.',
      questions: [makeQuestion({ type: 'recitation', recitationText: 'Twinkle twinkle' })],
      mode: 'recite',
      schoolId: 'school_abc',
      sourceChannelId: 'chan_123',
    });
    expect(session.schoolId).toBe('school_abc');
    expect(session.sourceChannelId).toBe('chan_123');
    expect(session.kidId).toBe('kid_7');
  });
});

describe('recordAnswer', () => {
  async function seed() {
    return createHomeworkSession({
      sessionId: 'chat_1',
      gsiSessionId: 'sess_1',
      kidId: null,
      platform: 'telegram',
      subject: 'Math',
      gradeEstimate: 5,
      language: 'en',
      originalText: 'q',
      questions: [
        makeQuestion({ id: 1 }),
        makeQuestion({ id: 2, text: 'What is 3 + 3?' }),
      ],
      mode: 'quiz',
    });
  }

  it('advances currentIndex only when advance=true', async () => {
    const session = await seed();
    const afterFail = await recordAnswer({
      id: session.id,
      questionId: 1,
      answer: '3',
      correct: false,
      score: 0,
      revealed: false,
      advance: false,
    });
    expect(afterFail.progress.currentIndex).toBe(0);
    expect(afterFail.progress.answers[0]!.attempts).toBe(1);

    const afterSuccess = await recordAnswer({
      id: session.id,
      questionId: 1,
      answer: '4',
      correct: true,
      score: 100,
      revealed: false,
      advance: true,
    });
    expect(afterSuccess.progress.currentIndex).toBe(1);
    expect(afterSuccess.progress.answers[0]!.attempts).toBe(2);
    expect(afterSuccess.progress.answers[0]!.correct).toBe(true);
  });

  it('tracks revealedQuestionIds and excludes them from the mastery score', async () => {
    const session = await seed();
    await recordAnswer({
      id: session.id,
      questionId: 1,
      answer: 'bad',
      correct: true, // pretend-correct after reveal
      score: 0,
      revealed: true,
      advance: true,
    });
    const after = await recordAnswer({
      id: session.id,
      questionId: 2,
      answer: '6',
      correct: true,
      score: 100,
      revealed: false,
      advance: true,
    });
    expect(after.revealedQuestionIds).toEqual([1]);
    // Mastery denominator excludes the revealed Q → 100/1 = 100.
    expect(after.score).toBe(100);
    expect(after.progress.completedAt).toBeTruthy();
  });

  it('completes when currentIndex reaches totalQuestions', async () => {
    const session = await seed();
    await recordAnswer({
      id: session.id,
      questionId: 1,
      answer: '4',
      correct: true,
      score: 100,
      revealed: false,
      advance: true,
    });
    const after = await recordAnswer({
      id: session.id,
      questionId: 2,
      answer: '6',
      correct: true,
      score: 100,
      revealed: false,
      advance: true,
    });
    expect(after.progress.completedAt).toBeTruthy();
    expect(after.score).toBe(100);
  });
});

describe('getHomeworkSession', () => {
  it('returns null for missing sessions', async () => {
    const result = await getHomeworkSession('hw_does_not_exist');
    expect(result).toBeNull();
  });
});

// Suppress unused Timestamp import warning — it's pulled in because the
// store writes Timestamps via the admin SDK.
void Timestamp;
