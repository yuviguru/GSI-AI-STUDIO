import { describe, it, expect } from 'vitest';
import { ALL_PROMPTS, getRandomPrompt } from './prompts';
import type { BeatTheAiCategory } from '@/types/beatTheAi.types';

const CATEGORIES: BeatTheAiCategory[] = ['story_sprint', 'quiz_whiz', 'caption_battle', 'rhyme_time'];

describe('ALL_PROMPTS', () => {
  it('has 80+ total prompts', () => {
    expect(ALL_PROMPTS.length).toBeGreaterThanOrEqual(80);
  });

  it('has at least 20 prompts per category', () => {
    for (const cat of CATEGORIES) {
      const count = ALL_PROMPTS.filter((p) => p.category === cat).length;
      expect(count).toBeGreaterThanOrEqual(20);
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

  it('story_sprint prompts have 180s time limit', () => {
    ALL_PROMPTS.filter((p) => p.category === 'story_sprint').forEach((p) => {
      expect(p.timeLimit).toBe(180);
    });
  });

  it('quiz_whiz prompts have 240s time limit', () => {
    ALL_PROMPTS.filter((p) => p.category === 'quiz_whiz').forEach((p) => {
      expect(p.timeLimit).toBe(240);
    });
  });

  it('caption_battle prompts have 90s time limit', () => {
    ALL_PROMPTS.filter((p) => p.category === 'caption_battle').forEach((p) => {
      expect(p.timeLimit).toBe(90);
    });
  });

  it('rhyme_time prompts have 120s time limit', () => {
    ALL_PROMPTS.filter((p) => p.category === 'rhyme_time').forEach((p) => {
      expect(p.timeLimit).toBe(120);
    });
  });

  it('has a mix of India-themed and non-India-themed prompts', () => {
    const indiaThemed = ALL_PROMPTS.filter((p) => p.isIndiaThemed).length;
    const nonIndiaThemed = ALL_PROMPTS.filter((p) => !p.isIndiaThemed).length;
    expect(indiaThemed).toBeGreaterThan(10);
    expect(nonIndiaThemed).toBeGreaterThan(10);
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
