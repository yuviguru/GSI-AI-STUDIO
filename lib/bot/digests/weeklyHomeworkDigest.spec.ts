import { describe, it, expect, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import {
  computeStats,
  buildDigestMessage,
  runWeeklyDigest,
} from './weeklyHomeworkDigest';
import type { HomeworkSession, MessengerAdapter } from '@/lib/bot/types';

// ─── Firestore mocks for the runWeeklyDigest test ───────────

interface FakeChat {
  chatId: string;
  gsiSessionId: string;
  kidId: string | null;
}

interface FakeSession extends Partial<HomeworkSession> {
  chatId: string;
  gsiSessionId: string;
  kidId: string | null;
  createdAtMs: number;
}

let fakeChats: FakeChat[] = [];
let fakeSessions: FakeSession[] = [];

function buildFakeQuery(collection: string) {
  const state = {
    kidEquals: null as string | null,
    sinceMs: null as number | null,
    gsiSessionId: null as string | null,
    botHandle: null as string | null,
  };
  const api: Record<string, unknown> = {
    where(field: string, op: string, value: unknown) {
      if (collection === 'botSessions') {
        if (field === 'botHandle' && op === '==') state.botHandle = String(value);
      } else if (collection === 'homeworkSessions') {
        if (field === 'gsiSessionId' && op === '==') state.gsiSessionId = String(value);
        if (field === 'kidId' && op === '==') state.kidEquals = String(value);
        if (field === 'createdAt' && op === '>=' && value instanceof Timestamp) {
          state.sinceMs = value.toMillis();
        }
      }
      return api;
    },
    orderBy() {
      return api;
    },
    async get() {
      if (collection === 'botSessions') {
        return {
          docs: fakeChats.map((c, i) => ({ id: `doc${i}`, data: () => c })),
          size: fakeChats.length,
        };
      }
      if (collection === 'homeworkSessions') {
        const matches = fakeSessions.filter((s) => {
          if (state.gsiSessionId && s.gsiSessionId !== state.gsiSessionId) return false;
          if (state.kidEquals && s.kidId !== state.kidEquals) return false;
          if (state.sinceMs != null && s.createdAtMs < state.sinceMs) return false;
          return true;
        });
        return {
          empty: matches.length === 0,
          docs: matches.map((s, i) => ({ id: `hw${i}`, data: () => toSession(s) })),
        };
      }
      return { empty: true, docs: [], size: 0 };
    },
  };
  return api;
}

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => buildFakeQuery(name),
  },
}));

function toSession(s: FakeSession): HomeworkSession {
  const now = Timestamp.fromMillis(s.createdAtMs);
  const defaultSession: HomeworkSession = {
    id: 'hw',
    sessionId: s.chatId,
    gsiSessionId: s.gsiSessionId,
    kidId: s.kidId,
    platform: 'telegram',
    subject: 'Math',
    gradeEstimate: 5,
    language: 'en',
    originalText: '',
    totalQuestions: 2,
    questions: [],
    progress: {
      currentIndex: 2,
      mode: 'quiz',
      startedAt: now,
      completedAt: now,
      answers: [],
    },
    score: 80,
    revealedQuestionIds: [],
    schoolId: null,
    sourceChannelId: null,
    createdAt: now,
    updatedAt: now,
  };
  return { ...defaultSession, ...s } as HomeworkSession;
}

function resetFakeDb() {
  fakeChats = [];
  fakeSessions = [];
}

function makeSession(overrides: Partial<HomeworkSession> = {}): HomeworkSession {
  const now = Timestamp.now();
  return {
    id: 'hw_test',
    sessionId: 'chat_1',
    gsiSessionId: 'sess_1',
    kidId: null,
    platform: 'telegram',
    subject: 'Math',
    gradeEstimate: 5,
    language: 'en',
    originalText: 'q',
    totalQuestions: 3,
    questions: [],
    progress: {
      currentIndex: 3,
      mode: 'quiz',
      startedAt: now,
      completedAt: now,
      answers: [],
    },
    score: 80,
    revealedQuestionIds: [],
    schoolId: null,
    sourceChannelId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('computeStats', () => {
  it('ignores sessions still in progress', () => {
    const stats = computeStats([
      makeSession({ progress: { ...makeSession().progress, completedAt: null } }),
      makeSession({ score: 90 }),
    ]);
    expect(stats.completed).toBe(1);
    expect(stats.averageScore).toBe(90);
  });

  it('averages score across completed sessions only', () => {
    const stats = computeStats([
      makeSession({ score: 60 }),
      makeSession({ score: 80 }),
      makeSession({ score: 100 }),
    ]);
    expect(stats.averageScore).toBe(80);
  });

  it('picks strongest and working-on subjects when multiple exist', () => {
    const stats = computeStats([
      makeSession({ subject: 'Math', score: 90 }),
      makeSession({ subject: 'Math', score: 80 }),
      makeSession({ subject: 'English', score: 40 }),
    ]);
    expect(stats.strongest).toBe('Math');
    expect(stats.workingOn).toBe('English');
  });

  it('suppresses working-on when only a single subject was practised', () => {
    const stats = computeStats([
      makeSession({ subject: 'Math', score: 75 }),
      makeSession({ subject: 'Math', score: 80 }),
    ]);
    expect(stats.strongest).toBe('Math');
    expect(stats.workingOn).toBeNull();
  });

  it('tallies revealed question totals across completed sessions', () => {
    const stats = computeStats([
      makeSession({ revealedQuestionIds: [1, 2] }),
      makeSession({ revealedQuestionIds: [3] }),
    ]);
    expect(stats.revealedTotal).toBe(3);
  });

  it('returns zero counts for an empty input', () => {
    const stats = computeStats([]);
    expect(stats).toEqual({
      completed: 0,
      averageScore: 0,
      subjects: [],
      strongest: null,
      workingOn: null,
      revealedTotal: 0,
    });
  });
});

describe('runWeeklyDigest — kid scoping', () => {
  it('filters per-chat sessions by the chat\'s kidId so siblings don\'t mix', async () => {
    resetFakeDb();
    const now = Date.UTC(2026, 3, 19, 12, 0, 0);
    fakeChats = [
      {
        chatId: 'chat_sibling_a',
        gsiSessionId: 'shared_sess',
        kidId: 'kid_a',
      },
      {
        chatId: 'chat_sibling_b',
        gsiSessionId: 'shared_sess',
        kidId: 'kid_b',
      },
    ];
    fakeSessions = [
      // Kid A's homework — recent, Math, high score
      {
        chatId: 'chat_sibling_a',
        gsiSessionId: 'shared_sess',
        kidId: 'kid_a',
        subject: 'Math',
        score: 90,
        createdAtMs: now - 24 * 60 * 60 * 1000,
      },
      // Kid B's homework — recent, Science, lower score
      {
        chatId: 'chat_sibling_b',
        gsiSessionId: 'shared_sess',
        kidId: 'kid_b',
        subject: 'Science',
        score: 50,
        createdAtMs: now - 12 * 60 * 60 * 1000,
      },
    ];

    const seen: Array<{ chatId: string; text: string }> = [];
    const adapter: Pick<MessengerAdapter, 'send'> = {
      async send(msg) {
        seen.push({ chatId: String(msg.chatId), text: msg.text });
        return 'ok';
      },
    };

    const result = await runWeeklyDigest({ now, adapter });
    expect(result.digestsSent).toBe(2);

    const aDigest = seen.find((s) => s.chatId === 'chat_sibling_a');
    const bDigest = seen.find((s) => s.chatId === 'chat_sibling_b');
    expect(aDigest?.text).toContain('Math');
    expect(aDigest?.text).not.toContain('Science');
    expect(bDigest?.text).toContain('Science');
    expect(bDigest?.text).not.toContain('Math');
  });

  it('falls back to gsiSessionId-only filtering for chats with no bound kidId', async () => {
    resetFakeDb();
    const now = Date.UTC(2026, 3, 19, 12, 0, 0);
    fakeChats = [
      {
        chatId: 'chat_anon',
        gsiSessionId: 'anon_sess',
        kidId: null,
      },
    ];
    fakeSessions = [
      {
        chatId: 'chat_anon',
        gsiSessionId: 'anon_sess',
        kidId: null,
        subject: 'English',
        score: 70,
        createdAtMs: now - 2 * 60 * 60 * 1000,
      },
    ];

    const seen: Array<{ chatId: string }> = [];
    const adapter: Pick<MessengerAdapter, 'send'> = {
      async send(msg) {
        seen.push({ chatId: String(msg.chatId) });
        return 'ok';
      },
    };

    const result = await runWeeklyDigest({ now, adapter });
    expect(result.digestsSent).toBe(1);
    expect(seen[0]?.chatId).toBe('chat_anon');
  });
});

describe('buildDigestMessage', () => {
  it('includes score, subjects, and revealed-count line when applicable', () => {
    const { text } = buildDigestMessage([
      makeSession({ subject: 'Math', score: 90 }),
      makeSession({ subject: 'English', score: 60, revealedQuestionIds: [1] }),
    ]);
    expect(text).toContain('*Homework this week*');
    expect(text).toContain('*2* homework sessions');
    expect(text).toContain('Average score: *75%*');
    expect(text).toContain('Math');
    expect(text).toContain('English');
    expect(text).toContain('Let me help with 1 question');
  });

  it('omits working-on for single-subject weeks', () => {
    const { text } = buildDigestMessage([
      makeSession({ subject: 'Math', score: 80 }),
    ]);
    expect(text).toContain('💪 Strongest: *Math*');
    expect(text).not.toContain('🪄 Working on:');
  });
});
