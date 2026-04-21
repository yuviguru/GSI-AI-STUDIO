import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { computeStats, buildDigestMessage } from './weeklyHomeworkDigest';
import type { HomeworkSession } from '@/lib/bot/types';

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
