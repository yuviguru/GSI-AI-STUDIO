import { describe, it, expect } from 'vitest';
import { BLOCKLIST_PATTERNS } from './blocklist';

// Helper: check if any pattern in the blocklist matches the given text
function matchesBlocklist(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKLIST_PATTERNS.some((pattern) => pattern.test(lower));
}

describe('BLOCKLIST_PATTERNS', () => {
  // ─── Structure ─────────────────────────────────────────────
  describe('pattern structure', () => {
    it('exports a non-empty array', () => {
      expect(BLOCKLIST_PATTERNS).toBeInstanceOf(Array);
      expect(BLOCKLIST_PATTERNS.length).toBeGreaterThan(0);
    });

    it('every entry is a RegExp', () => {
      for (const pattern of BLOCKLIST_PATTERNS) {
        expect(pattern).toBeInstanceOf(RegExp);
      }
    });

    it('every pattern has the "i" flag for case insensitivity', () => {
      for (const pattern of BLOCKLIST_PATTERNS) {
        expect(pattern.flags).toContain('i');
      }
    });

    it('every pattern uses word boundaries (\\b)', () => {
      for (const pattern of BLOCKLIST_PATTERNS) {
        expect(pattern.source).toContain('\\b');
      }
    });
  });

  // ─── Violence ──────────────────────────────────────────────
  describe('violence patterns', () => {
    it.each([
      'kill', 'murder', 'assassin', 'torture', 'shoot', 'stab',
      'bomb', 'explosion', 'terrorist', 'attack', 'warfare',
    ])('matches "%s"', (word) => {
      expect(matchesBlocklist(word)).toBe(true);
    });

    it.each([
      'kill the hero', 'a murder mystery', 'bomb the test',
    ])('matches in sentence: "%s"', (sentence) => {
      expect(matchesBlocklist(sentence)).toBe(true);
    });
  });

  // ─── Sexual content ────────────────────────────────────────
  describe('sexual content patterns', () => {
    it.each([
      'sex', 'porn', 'nude', 'naked', 'erotic', 'nsfw',
      'xxx', 'adult content',
    ])('matches "%s"', (word) => {
      expect(matchesBlocklist(word)).toBe(true);
    });

    // Known gap: "18+" has trailing \b that can't match after "+" (non-word char)
    it('does NOT match "18+" due to \\b after non-word char (known gap)', () => {
      expect(matchesBlocklist('18+')).toBe(false);
    });
  });

  // ─── Substances ────────────────────────────────────────────
  describe('substance patterns', () => {
    it.each([
      'cocaine', 'heroin', 'meth', 'marijuana', 'weed', 'drugs',
      'drunk', 'alcohol', 'beer', 'wine', 'vodka', 'whiskey',
    ])('matches "%s"', (word) => {
      expect(matchesBlocklist(word)).toBe(true);
    });
  });

  // ─── Self-harm ─────────────────────────────────────────────
  describe('self-harm patterns', () => {
    it.each([
      'suicide', 'self-harm', 'selfharm', 'cut myself', 'end my life',
    ])('matches "%s"', (phrase) => {
      expect(matchesBlocklist(phrase)).toBe(true);
    });

    it('matches "self harm" with space', () => {
      expect(matchesBlocklist('self harm')).toBe(true);
    });
  });

  // ─── Hate speech ───────────────────────────────────────────
  describe('hate speech patterns', () => {
    it.each([
      'racist', 'hate speech',
    ])('matches "%s"', (phrase) => {
      expect(matchesBlocklist(phrase)).toBe(true);
    });

    // Known gap: /\bsupremac\b/ requires exact word "supremac" — doesn't match
    // "supremacist" or "supremacy" because \b can't fire mid-word
    it('does NOT match "supremacist" due to trailing \\b (known gap)', () => {
      expect(matchesBlocklist('supremacist')).toBe(false);
    });

    it('does NOT match "supremacy" due to trailing \\b (known gap)', () => {
      expect(matchesBlocklist('supremacy')).toBe(false);
    });
  });

  // ─── PII requests ─────────────────────────────────────────
  describe('PII request patterns', () => {
    it.each([
      'phone number', 'home address', 'credit card', 'social security',
      'password', 'bank account', 'aadhaar',
    ])('matches "%s"', (phrase) => {
      expect(matchesBlocklist(phrase)).toBe(true);
    });
  });

  // ─── Case insensitivity ────────────────────────────────────
  describe('case insensitivity', () => {
    it('matches uppercase KILL', () => {
      expect(matchesBlocklist('KILL')).toBe(true);
    });

    it('matches mixed case DrUgS', () => {
      expect(matchesBlocklist('DrUgS')).toBe(true);
    });

    it('matches uppercase SUICIDE', () => {
      expect(matchesBlocklist('SUICIDE')).toBe(true);
    });
  });

  // ─── False positives — child-friendly words must NOT match ─
  describe('false positives — safe words pass', () => {
    it.each([
      'skilled',
      'painkiller',
      'sextant',
      'heroine',
      'heroic',
      'seaweed',
      'method',
      'methodology',
      'butterfly',
      'dinosaur',
      'cricket',
      'football',
      'Diwali',
      'Holi',
      'Rangoli',
      'paneer',
      'mathematics',
      'science',
      'history',
      'princess',
      'superhero',
      'wizard',
      'dragon',
      'adventure',
      'friendship',
      'rainbow',
      'beautiful',
      'elephant',
      'drumstick',
      'peacock',
      'therapist',
      'grape',
      'grapefruit',
    ])('does NOT match safe word "%s"', (word) => {
      expect(matchesBlocklist(word)).toBe(false);
    });
  });

  // ─── Known gaps (documented for future stories) ────────────
  describe('known evasion gaps', () => {
    it.todo('detects leet speak evasion (e.g., "k1ll") — future INFRA story');
    it.todo('detects Unicode substitution (e.g., Cyrillic "а" for Latin "a") — future INFRA story');
    it.todo('detects spaced evasion (e.g., "k i l l") — future INFRA story');
  });
});
