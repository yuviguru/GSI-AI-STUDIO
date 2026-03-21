import { describe, it, expect } from 'vitest';
import { ALL_PROMPTS, getRandomPrompt } from './prompts';
import type { BeatTheAiCategory } from '@/types/beatTheAi.types';

const CATEGORIES: BeatTheAiCategory[] = [
  'story_sprint', 'rhyme_time',
  'fact_or_bluff', 'comeback_king', 'explain_it', 'debate_champ',
  'math_wizard', 'science_detective', 'code_cracker',
];

/** Expected time limit per category */
const EXPECTED_TIME_LIMITS: Record<BeatTheAiCategory, number> = {
  story_sprint: 180,
  rhyme_time: 120,
  fact_or_bluff: 90,
  comeback_king: 60,
  explain_it: 120,
  debate_champ: 120,
  math_wizard: 90,
  science_detective: 120,
  code_cracker: 90,
};

describe('ALL_PROMPTS', () => {
  it('has 170+ total prompts', () => {
    expect(ALL_PROMPTS.length).toBeGreaterThanOrEqual(170);
  });

  it('has at least 20 prompts per category', () => {
    for (const cat of CATEGORIES) {
      const count = ALL_PROMPTS.filter((p) => p.category === cat).length;
      expect(count, `${cat} should have ≥20 prompts, has ${count}`).toBeGreaterThanOrEqual(20);
    }
  });

  it('has no duplicate prompt texts', () => {
    const texts = ALL_PROMPTS.map((p) => p.text);
    const unique = new Set(texts);
    expect(unique.size).toBe(texts.length);
  });

  it('every prompt has required fields', () => {
    for (const prompt of ALL_PROMPTS) {
      expect(prompt.text).toBeTruthy();
      expect(prompt.theme).toBeTruthy();
      expect(prompt.timeLimit).toBeGreaterThan(0);
      expect(CATEGORIES).toContain(prompt.category);
      expect(typeof prompt.isIndiaThemed).toBe('boolean');
    }
  });

  it('each category has correct time limit', () => {
    for (const cat of CATEGORIES) {
      const expected = EXPECTED_TIME_LIMITS[cat];
      ALL_PROMPTS.filter((p) => p.category === cat).forEach((p) => {
        expect(p.timeLimit, `${cat} prompt should have ${expected}s time limit`).toBe(expected);
      });
    }
  });

  it('has a mix of India-themed and non-India-themed prompts', () => {
    const indiaThemed = ALL_PROMPTS.filter((p) => p.isIndiaThemed).length;
    const nonIndiaThemed = ALL_PROMPTS.filter((p) => !p.isIndiaThemed).length;
    expect(indiaThemed).toBeGreaterThan(20);
    expect(nonIndiaThemed).toBeGreaterThan(20);
  });
});

describe('getRandomPrompt', () => {
  it('returns a valid prompt for each category', () => {
    for (const cat of CATEGORIES) {
      const prompt = getRandomPrompt(cat);
      expect(prompt.category).toBe(cat);
      expect(prompt.text).toBeTruthy();
    }
  });

  it('returns prompts from the correct category', () => {
    for (let i = 0; i < 20; i++) {
      const prompt = getRandomPrompt('story_sprint');
      expect(prompt.category).toBe('story_sprint');
    }
  });

  it('returns different prompts over multiple calls (not always same)', () => {
    const results = new Set<string>();
    for (let i = 0; i < 30; i++) {
      results.add(getRandomPrompt('story_sprint').text);
    }
    // Should get at least a few different prompts
    expect(results.size).toBeGreaterThan(1);
  });
});
