import { describe, it, expect, vi } from 'vitest';
import type { SkillArenaChallenge, SkillArenaAnswer } from '@gsi/types';

// Mock the AI module to avoid real API calls
vi.mock('@/lib/ai/claude', () => ({
  generateJsonWithClaude: vi.fn(),
  shouldUseGroq: vi.fn(() => false),
}));
vi.mock('@/lib/ai/groq', () => ({
  generateJsonWithGroq: vi.fn(),
}));
vi.mock('@/lib/safety/filter', () => ({
  filterOutput: vi.fn((text: string) => text),
}));

import { evaluateAssessment } from './evaluator';

// ─── Helper factories ─────────────────────────────────────

function makeMcqChallenge(id: string, correctOption: string): SkillArenaChallenge {
  return {
    id,
    type: 'logic',
    module: 'thinking',
    question: {
      text: 'Test question',
      options: ['A', 'B', 'C', 'D'],
      correctOption,
      timeLimit: 45,
    },
  };
}

function makeOpenChallenge(id: string): SkillArenaChallenge {
  return {
    id,
    type: 'what_if',
    module: 'thinking',
    question: {
      text: 'What if you could fly?',
      timeLimit: 90,
    },
  };
}

function makeAnswer(challengeId: string, selectedOption?: string, text?: string): SkillArenaAnswer {
  return {
    challengeId,
    selectedOption,
    text,
    timeUsedSeconds: 30,
  };
}

// ─── MCQ Auto-Scoring ────────────────────────────────────

describe('evaluateAssessment — MCQ auto-scoring', () => {
  it('scores correct MCQ answer as 20/20', async () => {
    const challenges = [makeMcqChallenge('c1', 'B')];
    const answers = [makeAnswer('c1', 'B')];

    const result = await evaluateAssessment('thinking', challenges, answers, 'medium');

    expect(result.challengeResults).toHaveLength(1);
    expect(result.challengeResults[0]!.score).toBe(20);
    expect(result.challengeResults[0]!.maxScore).toBe(20);
  });

  it('scores incorrect MCQ answer as 0/20', async () => {
    const challenges = [makeMcqChallenge('c1', 'B')];
    const answers = [makeAnswer('c1', 'C')];

    const result = await evaluateAssessment('thinking', challenges, answers, 'medium');

    expect(result.challengeResults[0]!.score).toBe(0);
  });

  it('calculates correct total score for all-MCQ assessment', async () => {
    const challenges = [
      makeMcqChallenge('c1', 'A'),
      makeMcqChallenge('c2', 'B'),
      makeMcqChallenge('c3', 'C'),
    ];
    const answers = [
      makeAnswer('c1', 'A'), // correct
      makeAnswer('c2', 'D'), // wrong
      makeAnswer('c3', 'C'), // correct
    ];

    const result = await evaluateAssessment('thinking', challenges, answers, 'medium');

    // 2/3 correct × 20 each = 40 raw, normalized: round(40/60 * 100) = 67
    expect(result.score).toBe(67);
  });

  it('generates mentor feedback for all-MCQ assessment without AI call', async () => {
    const challenges = [makeMcqChallenge('c1', 'A')];
    const answers = [makeAnswer('c1', 'A')];

    const result = await evaluateAssessment('thinking', challenges, answers, 'medium');

    expect(result.mentorFeedback).toBeDefined();
    expect(result.mentorFeedback.strengths.length).toBeGreaterThan(0);
    expect(result.mentorFeedback.encouragement).toBeTruthy();
  });
});
