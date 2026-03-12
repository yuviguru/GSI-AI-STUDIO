import { describe, it, expect } from 'vitest';
import {
  getRandomChallenges,
  getQuestionsByModule,
  getTotalQuestionCount,
} from './questionBank';
import type { SkillArenaModule, SkillArenaDifficulty } from '@/types/mindx.types';

// ─── getRandomChallenges ─────────────────────────────────

describe('getRandomChallenges', () => {
  const modules: SkillArenaModule[] = ['speaking', 'listening', 'thinking', 'reading'];
  const difficulties: SkillArenaDifficulty[] = ['easy', 'medium', 'hard'];

  it('returns requested number of challenges', () => {
    const challenges = getRandomChallenges('thinking', 'medium', 5);
    expect(challenges.length).toBe(5);
  });

  it('returns challenges with unique IDs', () => {
    const challenges = getRandomChallenges('reading', 'medium', 5);
    const ids = challenges.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns challenges matching the requested module', () => {
    for (const mod of modules) {
      const challenges = getRandomChallenges(mod, 'medium', 3);
      for (const c of challenges) {
        expect(c.module).toBe(mod);
      }
    }
  });

  it('returns valid challenge structure', () => {
    const challenges = getRandomChallenges('speaking', 'easy', 3);
    for (const c of challenges) {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('type');
      expect(c).toHaveProperty('module');
      expect(c).toHaveProperty('question');
      expect(c.question).toHaveProperty('text');
      expect(c.question).toHaveProperty('timeLimit');
      expect(c.question.timeLimit).toBeGreaterThan(0);
    }
  });

  it('all difficulty levels have questions for each module', () => {
    for (const mod of modules) {
      for (const diff of difficulties) {
        const challenges = getRandomChallenges(mod, diff, 1);
        expect(challenges.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('tries to include variety of challenge types', () => {
    // With 5 challenges, should try to cover multiple types
    const challenges = getRandomChallenges('thinking', 'medium', 5);
    const types = new Set(challenges.map((c) => c.type));
    // Thinking has 4 types: logic, what_if, odd_one_out, analogy
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it('MCQ questions have options and correctOption', () => {
    const challenges = getRandomChallenges('thinking', 'easy', 5);
    for (const c of challenges) {
      if (c.type === 'logic' || c.type === 'analogy') {
        expect(c.question.options).toBeDefined();
        expect(c.question.options!.length).toBeGreaterThanOrEqual(2);
        expect(c.question.correctOption).toBeDefined();
      }
    }
  });

  it('listening questions have audioText', () => {
    const challenges = getRandomChallenges('listening', 'medium', 5);
    for (const c of challenges) {
      if (c.type === 'comprehension' || c.type === 'follow_instructions' || c.type === 'key_points') {
        expect(c.question.audioText).toBeDefined();
        expect(c.question.audioText!.length).toBeGreaterThan(0);
      }
    }
  });

  it('speaking read_aloud questions have passage', () => {
    const challenges = getRandomChallenges('speaking', 'easy', 5);
    for (const c of challenges) {
      if (c.type === 'read_aloud') {
        expect(c.question.passage).toBeDefined();
        expect(c.question.passage!.length).toBeGreaterThan(0);
      }
    }
  });

  it('reading questions have passages', () => {
    const challenges = getRandomChallenges('reading', 'medium', 5);
    for (const c of challenges) {
      if (c.type === 'comprehension' || c.type === 'inference' || c.type === 'summarize') {
        expect(c.question.passage).toBeDefined();
      }
    }
  });
});

// ─── getQuestionsByModule ────────────────────────────────

describe('getQuestionsByModule', () => {
  it('returns questions only for the requested module', () => {
    const questions = getQuestionsByModule('speaking');
    for (const q of questions) {
      expect(q.module).toBe('speaking');
    }
  });

  it('each module has at least 10 questions', () => {
    const modules: SkillArenaModule[] = ['speaking', 'listening', 'thinking', 'reading'];
    for (const mod of modules) {
      const questions = getQuestionsByModule(mod);
      expect(questions.length).toBeGreaterThanOrEqual(10);
    }
  });
});

// ─── getTotalQuestionCount ───────────────────────────────

describe('getTotalQuestionCount', () => {
  it('has a substantial question bank', () => {
    expect(getTotalQuestionCount()).toBeGreaterThanOrEqual(50);
  });
});
