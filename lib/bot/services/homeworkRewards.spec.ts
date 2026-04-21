import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import type { HomeworkSession } from '@/lib/bot/types';

vi.mock('@/lib/firebase/sessionService', () => ({
  updateSessionPoints: vi.fn(),
}));

import { updateSessionPoints } from '@/lib/firebase/sessionService';
import {
  computePointsForSession,
  applyHomeworkReward,
  todayIsoKolkata,
} from './homeworkRewards';

function makeSession(overrides: Partial<HomeworkSession> = {}): HomeworkSession {
  const now = Timestamp.now();
  return {
    id: 'hw_x',
    sessionId: 'chat_1',
    gsiSessionId: 'sess_1',
    kidId: null,
    platform: 'telegram',
    subject: 'Math',
    gradeEstimate: 5,
    language: 'en',
    originalText: 'What is 2 + 2?',
    totalQuestions: 4,
    questions: [],
    progress: {
      currentIndex: 4,
      mode: 'quiz',
      startedAt: now,
      completedAt: now,
      answers: [
        { questionId: 1, answer: '4', correct: true, attempts: 1, score: 100, revealed: false },
        { questionId: 2, answer: '6', correct: true, attempts: 1, score: 100, revealed: false },
        { questionId: 3, answer: '9', correct: true, attempts: 2, score: 100, revealed: false },
        {
          questionId: 4,
          answer: 'reveal',
          correct: true,
          attempts: 3,
          score: 0,
          revealed: true,
        },
      ],
    },
    score: 75,
    revealedQuestionIds: [4],
    schoolId: null,
    sourceChannelId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('computePointsForSession', () => {
  it('awards base + per-question bonuses, reveal-weighted', () => {
    const session = makeSession();
    // base 20 (score-scaled → 20*75/100=15, floored at 20) +
    // 3 unrevealed correct × 2 = 6 + 1 revealed correct × 0.6 = 0.6 → round 7
    // Expected: 27 (20 + 7)
    const points = computePointsForSession(session);
    expect(points).toBe(27);
  });

  it('always awards at least BASE_POINTS when mastery is 0', () => {
    const zero = makeSession({
      score: 0,
      progress: {
        ...makeSession().progress,
        answers: [],
      },
    });
    expect(computePointsForSession(zero)).toBeGreaterThanOrEqual(20);
  });

  it('scales up when mastery is very high', () => {
    const high = makeSession({
      score: 100,
      progress: {
        ...makeSession().progress,
        answers: [
          { questionId: 1, answer: '', correct: true, attempts: 1, score: 100, revealed: false },
          { questionId: 2, answer: '', correct: true, attempts: 1, score: 100, revealed: false },
        ],
      },
      totalQuestions: 2,
    });
    // 20 base + 2*2 bonus = 24
    expect(computePointsForSession(high)).toBeGreaterThanOrEqual(24);
  });
});

describe('todayIsoKolkata', () => {
  it('returns YYYY-MM-DD for an IST day boundary case', () => {
    // 2026-04-19 23:00 UTC = 2026-04-20 04:30 IST → Apr 20
    const utcLate = Date.UTC(2026, 3, 19, 23, 0, 0);
    expect(todayIsoKolkata(utcLate)).toBe('2026-04-20');
  });

  it('respects IST even for earlier UTC hours', () => {
    // 2026-04-19 01:00 UTC = 2026-04-19 06:30 IST → Apr 19
    const utcEarly = Date.UTC(2026, 3, 19, 1, 0, 0);
    expect(todayIsoKolkata(utcEarly)).toBe('2026-04-19');
  });
});

describe('applyHomeworkReward', () => {
  beforeEach(() => {
    vi.mocked(updateSessionPoints).mockReset();
  });

  it('delegates to updateSessionPoints with complete_homework action', async () => {
    vi.mocked(updateSessionPoints).mockResolvedValueOnce({
      data: {
        aiPoints: 45,
        badges: ['homework_hero_bronze'],
        conceptsLearned: [],
        creationsByType: {},
        shareCount: 0,
        homeworkStats: {
          sessionsCompleted: 1,
          currentStreak: 1,
          longestStreak: 1,
          lastCompletedDate: '2026-04-19',
        },
      },
      newBadges: ['homework_hero_bronze'],
    });

    const result = await applyHomeworkReward({
      gsiSessionId: 'sess_1',
      kidId: null,
      session: makeSession(),
      now: Date.UTC(2026, 3, 19, 10, 0, 0),
    });

    expect(updateSessionPoints).toHaveBeenCalledTimes(1);
    const [sessionId, action, kidId] = vi.mocked(updateSessionPoints).mock.calls[0]!;
    expect(sessionId).toBe('sess_1');
    expect(kidId).toBeUndefined();
    expect(action).toMatchObject({
      action: 'complete_homework',
      todayDate: '2026-04-19',
    });
    expect(result.newBadges).toEqual(['homework_hero_bronze']);
    expect(result.pointsAwarded).toBeGreaterThan(0);
  });
});
