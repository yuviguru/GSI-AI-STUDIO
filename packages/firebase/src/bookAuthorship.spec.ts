import { describe, it, expect } from 'vitest';
import { lcsLength, recomputePageAuthorship, aggregateBookAuthorship } from './bookAuthorship';
import type { PageAuthorship } from '@gsi/types';

describe('lcsLength', () => {
  it('returns 0 on empty inputs', () => {
    expect(lcsLength('', '')).toBe(0);
    expect(lcsLength('abc', '')).toBe(0);
    expect(lcsLength('', 'xyz')).toBe(0);
  });

  it('returns full length when strings are identical', () => {
    expect(lcsLength('hello', 'hello')).toBe(5);
  });

  it('counts in-order overlap for partial replacements', () => {
    // 'hello' vs 'helXo' → LCS = 'helo' = 4
    expect(lcsLength('hello', 'helXo')).toBe(4);
  });

  it('returns 0 when there is no common character', () => {
    expect(lcsLength('abc', 'xyz')).toBe(0);
  });

  it('handles a long disjoint replacement honestly', () => {
    const a = 'A dragon flew over the castle';
    const b = 'The pirate sailed the seven seas';
    // Common chars present but not many in order — LCS should be small
    const result = lcsLength(a, b);
    expect(result).toBeLessThan(15);
  });
});

const now = new Date('2026-05-27T00:00:00Z');

describe('recomputePageAuthorship', () => {
  it('kid_written page stays 100% kid regardless of text', () => {
    const existing: PageAuthorship = {
      source: 'kid_written',
      originalAiText: '',
      aiCharCount: 0,
      kidCharCount: 10,
      imageSource: 'none',
      lastEditedAt: now,
    };
    const result = recomputePageAuthorship({
      existing,
      newPlainText: 'Hello there friend',
      now,
    });
    expect(result.source).toBe('kid_written');
    expect(result.aiCharCount).toBe(0);
    expect(result.kidCharCount).toBe('Hello there friend'.length);
  });

  it('legacy page (null authorship) treated as kid_written', () => {
    const result = recomputePageAuthorship({
      existing: null,
      newPlainText: 'hi',
      now,
    });
    expect(result.source).toBe('kid_written');
    expect(result.aiCharCount).toBe(0);
    expect(result.kidCharCount).toBe(2);
  });

  it('AI page unedited stays ai_generated with full aiCharCount', () => {
    const aiText = 'A dragon flew over the castle.';
    const existing: PageAuthorship = {
      source: 'ai_generated',
      originalAiText: aiText,
      aiCharCount: aiText.length,
      kidCharCount: 0,
      imageSource: 'ai_generated',
      lastEditedAt: now,
    };
    const result = recomputePageAuthorship({
      existing,
      newPlainText: aiText, // unchanged
      now,
    });
    expect(result.source).toBe('ai_generated');
    expect(result.aiCharCount).toBe(aiText.length);
    expect(result.kidCharCount).toBe(0);
  });

  it('AI page with appended kid text → mixed, aiCharCount unchanged, kid grows', () => {
    const aiText = 'A dragon flew.';
    const existing: PageAuthorship = {
      source: 'ai_generated',
      originalAiText: aiText,
      aiCharCount: aiText.length,
      kidCharCount: 0,
      imageSource: 'ai_generated',
      lastEditedAt: now,
    };
    const result = recomputePageAuthorship({
      existing,
      newPlainText: aiText + ' It was very loud.',
      now,
    });
    expect(result.source).toBe('mixed');
    expect(result.aiCharCount).toBe(aiText.length); // all AI text survived
    expect(result.kidCharCount).toBeGreaterThan(0);
  });

  it('AI page with full kid rewrite → ai decays toward 0', () => {
    const aiText = 'A dragon flew over the castle.';
    const existing: PageAuthorship = {
      source: 'ai_generated',
      originalAiText: aiText,
      aiCharCount: aiText.length,
      kidCharCount: 0,
      imageSource: 'ai_generated',
      lastEditedAt: now,
    };
    const result = recomputePageAuthorship({
      existing,
      newPlainText: 'Today I went swimming with my friends.',
      now,
    });
    expect(result.source).toBe('mixed');
    // LCS of disjoint sentences is small; AI share should drop a lot
    expect(result.aiCharCount).toBeLessThan(aiText.length / 2);
    expect(result.kidCharCount).toBeGreaterThan(20);
  });
});

describe('aggregateBookAuthorship', () => {
  it('sums per-page counts correctly', () => {
    const result = aggregateBookAuthorship({
      pages: [
        {
          authorship: {
            source: 'ai_generated',
            originalAiText: 'x'.repeat(100),
            aiCharCount: 100,
            kidCharCount: 0,
            imageSource: 'ai_generated',
            lastEditedAt: now,
          },
        },
        {
          authorship: {
            source: 'kid_written',
            originalAiText: '',
            aiCharCount: 0,
            kidCharCount: 50,
            imageSource: 'kid_added',
            lastEditedAt: now,
          },
        },
        { authorship: null }, // legacy page — should be ignored cleanly
      ],
      initialSource: 'ai_generated',
      now,
    });
    expect(result.aiCharTotal).toBe(100);
    expect(result.kidCharTotal).toBe(50);
    expect(result.aiImagePageCount).toBe(1);
    expect(result.kidImagePageCount).toBe(1);
    expect(result.initialSource).toBe('ai_generated');
  });
});
