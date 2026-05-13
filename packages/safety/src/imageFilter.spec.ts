import { describe, it, expect } from 'vitest';
import { filterImagePrompt } from './inputFilter';

describe('filterImagePrompt — comprehensive', () => {
  // ─── All 14 unsafe keywords blocked ────────────────────────
  describe('blocks all unsafe keywords', () => {
    it.each([
      'gun', 'weapon', 'knife', 'blood', 'gore',
      'nude', 'naked', 'sexy',
      'drug', 'alcohol', 'cigarette', 'smoking',
      'kill', 'death',
    ])('blocks "%s"', (word) => {
      expect(() => filterImagePrompt(`a ${word} in the scene`)).toThrow(
        "Let's try a different image idea"
      );
    });
  });

  // ─── Safe prompts pass through ─────────────────────────────
  describe('safe prompts pass through unchanged', () => {
    it.each([
      'A colorful butterfly garden with rainbows',
      'Indian village with rice fields and farmers',
      'A friendly robot helping kids study',
      'Diwali celebration with diyas and rangoli',
      'A cat wearing a space helmet on the moon',
      'Children playing cricket in a park',
      'A magical treehouse in a banyan tree',
      'Underwater coral reef with colorful fish',
      'A happy family having a picnic by a river',
      'A train journey through the Western Ghats',
    ])('passes: "%s"', (prompt) => {
      expect(filterImagePrompt(prompt)).toBe(prompt);
    });
  });

  // ─── Word boundary — safe words with unsafe substrings ─────
  describe('word boundary — safe words pass', () => {
    it('allows "skilled archer" (contains "kill")', () => {
      expect(filterImagePrompt('a skilled archer in a forest')).toBeTruthy();
    });

    it('allows "gundam robot" (contains "gun")', () => {
      expect(filterImagePrompt('a gundam model robot')).toBeTruthy();
    });

    it('allows "drugstore" (contains "drug")', () => {
      expect(filterImagePrompt('a drugstore on the corner')).toBeTruthy();
    });

    it('allows "penknife" (contains "knife")', () => {
      expect(filterImagePrompt('a penknife display case')).toBeTruthy();
    });

    it('allows "smokestack" (does not contain "smoking" as whole word)', () => {
      expect(filterImagePrompt('a smokestack factory')).toBeTruthy();
    });

    it('allows "deadlines" (does not match "death")', () => {
      expect(filterImagePrompt('meeting deadlines at school')).toBeTruthy();
    });

    it('allows "gory" does not match as whole word "gore"', () => {
      // \bgore\b should NOT match "gory" — after 'e' is end in "gore" but "gory" has 'y' after 'e' wait...
      // "gore" is 4 letters. "gory" is 4 letters. \bgore\b tests for "gore" as a standalone word.
      // In "gory", the text is g-o-r-y, so "gore" is not present. Safe.
      expect(filterImagePrompt('a gory... actually a glory scene')).toBeTruthy();
    });
  });

  // ─── Case insensitivity ────────────────────────────────────
  describe('case insensitivity', () => {
    it('blocks uppercase GUN', () => {
      expect(() => filterImagePrompt('A GUN on the table')).toThrow(
        "Let's try a different image idea"
      );
    });

    it('blocks uppercase BLOOD', () => {
      expect(() => filterImagePrompt('BLOOD everywhere')).toThrow(
        "Let's try a different image idea"
      );
    });

    it('blocks mixed case NaKeD', () => {
      expect(() => filterImagePrompt('a NaKeD figure')).toThrow(
        "Let's try a different image idea"
      );
    });

    it('blocks mixed case DeAtH', () => {
      expect(() => filterImagePrompt('DeAtH and destruction')).toThrow(
        "Let's try a different image idea"
      );
    });
  });

  // ─── Compound safe prompts ─────────────────────────────────
  describe('compound safe prompts', () => {
    it('passes a long descriptive prompt with no unsafe words', () => {
      const prompt =
        'A beautiful sunrise over the Himalayas with colorful birds flying, ' +
        'snow-capped mountains, and a small village with prayer flags';
      expect(filterImagePrompt(prompt)).toBe(prompt);
    });

    it('passes a prompt with many adjectives', () => {
      const prompt = 'A magical, sparkling, golden, enchanted castle in the clouds';
      expect(filterImagePrompt(prompt)).toBe(prompt);
    });
  });

  // ─── Error shape ───────────────────────────────────────────
  describe('error shape', () => {
    it('throws AppException with code UNSAFE_CONTENT', () => {
      try {
        filterImagePrompt('a gun');
        expect.fail('Should have thrown');
      } catch (error: unknown) {
        expect((error as { code: string }).code).toBe('UNSAFE_CONTENT');
      }
    });

    it('throws with message "Let\'s try a different image idea!"', () => {
      expect(() => filterImagePrompt('a gun')).toThrow(
        "Let's try a different image idea!"
      );
    });

    it('throws with statusCode 400', () => {
      try {
        filterImagePrompt('a weapon');
        expect.fail('Should have thrown');
      } catch (error: unknown) {
        expect((error as { statusCode: number }).statusCode).toBe(400);
      }
    });
  });
});
