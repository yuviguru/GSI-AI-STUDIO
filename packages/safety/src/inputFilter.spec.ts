import { describe, it, expect } from 'vitest';
import { filterInput, filterOutput, filterImagePrompt } from './inputFilter';

describe('filterInput', () => {
  // ─── Clean input passes ─────────────────────────────────
  it('passes clean input through unchanged (trimmed)', () => {
    expect(filterInput('  A story about a brave dog  ')).toBe('A story about a brave dog');
  });

  it('passes a normal creative prompt', () => {
    expect(filterInput('Write a story about a princess who finds a magic crown')).toBeTruthy();
  });

  // ─── Minimum length ──────────────────────────────────────
  it('rejects input shorter than 3 characters', () => {
    expect(() => filterInput('hi')).toThrow('Tell us a bit more');
  });

  it('rejects empty string', () => {
    expect(() => filterInput('')).toThrow('Tell us a bit more');
  });

  it('rejects whitespace-only input (trimmed to empty)', () => {
    expect(() => filterInput('   ')).toThrow('Tell us a bit more');
  });

  it('accepts exactly 3-character input', () => {
    expect(filterInput('cat')).toBe('cat');
  });

  // ─── Violence blocklist ──────────────────────────────────
  it('blocks "kill" (violence)', () => {
    expect(() => filterInput('kill the dragon')).toThrow("Let's try a different idea");
  });

  it('blocks "murder" (violence)', () => {
    expect(() => filterInput('a murder mystery for kids')).toThrow("Let's try a different idea");
  });

  it('blocks "bomb" (violence)', () => {
    expect(() => filterInput('make a bomb go off')).toThrow("Let's try a different idea");
  });

  it('blocks "terrorist" (violence)', () => {
    expect(() => filterInput('story about a terrorist')).toThrow("Let's try a different idea");
  });

  // ─── Sexual content blocklist ────────────────────────────
  it('blocks "porn" (sexual)', () => {
    expect(() => filterInput('show me porn')).toThrow("Let's try a different idea");
  });

  it('blocks "nsfw" (sexual)', () => {
    expect(() => filterInput('nsfw content please')).toThrow("Let's try a different idea");
  });

  it('blocks "nude" (sexual)', () => {
    expect(() => filterInput('a nude scene')).toThrow("Let's try a different idea");
  });

  // ─── Substance blocklist ─────────────────────────────────
  it('blocks "cocaine" (substances)', () => {
    expect(() => filterInput('a story about cocaine')).toThrow("Let's try a different idea");
  });

  it('blocks "marijuana" (substances)', () => {
    expect(() => filterInput('growing marijuana')).toThrow("Let's try a different idea");
  });

  it('blocks "alcohol" (substances)', () => {
    expect(() => filterInput('drinking alcohol at a party')).toThrow("Let's try a different idea");
  });

  // ─── Self-harm blocklist ─────────────────────────────────
  it('blocks "suicide" (self-harm)', () => {
    expect(() => filterInput('a suicide note')).toThrow("Let's try a different idea");
  });

  it('blocks "self-harm" (self-harm)', () => {
    expect(() => filterInput('self-harm methods')).toThrow("Let's try a different idea");
  });

  // ─── Hate speech blocklist ───────────────────────────────
  it('blocks "racist" (hate)', () => {
    expect(() => filterInput('a racist joke')).toThrow("Let's try a different idea");
  });

  it('blocks "hate speech" (hate)', () => {
    expect(() => filterInput('a story with hate speech')).toThrow("Let's try a different idea");
  });

  // ─── PII blocklist ───────────────────────────────────────
  it('blocks "phone number" (PII)', () => {
    expect(() => filterInput('tell me your phone number')).toThrow("Let's try a different idea");
  });

  it('blocks "credit card" (PII)', () => {
    expect(() => filterInput('enter credit card details')).toThrow("Let's try a different idea");
  });

  it('blocks "aadhaar" (PII — India-specific)', () => {
    expect(() => filterInput('share your aadhaar number')).toThrow("Let's try a different idea");
  });

  it('blocks "password" (PII)', () => {
    expect(() => filterInput('give me your password')).toThrow("Let's try a different idea");
  });

  // ─── Case insensitivity ──────────────────────────────────
  it('blocks uppercase variant', () => {
    expect(() => filterInput('KILL the villains')).toThrow("Let's try a different idea");
  });

  it('blocks mixed case', () => {
    expect(() => filterInput('DrUgS are fun')).toThrow("Let's try a different idea");
  });

  // ─── Safe words with unsafe substrings pass ──────────────
  it('allows "skilled" (contains "kill" but word-bounded)', () => {
    expect(filterInput('a skilled magician')).toBe('a skilled magician');
  });

  it('allows "painkiller" (contains "kill" but word-bounded)', () => {
    expect(filterInput('the painkiller story')).toBe('the painkiller story');
  });

  // ─── AppException code ───────────────────────────────────
  it('throws with code UNSAFE_CONTENT for blocked input', () => {
    try {
      filterInput('kill everyone');
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      expect((error as { code: string }).code).toBe('UNSAFE_CONTENT');
    }
  });

  it('throws with code INVALID_INPUT for short input', () => {
    try {
      filterInput('ab');
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      expect((error as { code: string }).code).toBe('INVALID_INPUT');
    }
  });
});

describe('filterOutput', () => {
  it('passes clean output through unchanged', () => {
    const text = 'Once upon a time in a magical kingdom...';
    expect(filterOutput(text)).toBe(text);
  });

  it('redacts 10-digit phone numbers', () => {
    expect(filterOutput('Call me at 9876543210 for details')).toBe(
      'Call me at [REDACTED] for details'
    );
  });

  it('redacts email addresses', () => {
    expect(filterOutput('Email me at test@example.com please')).toBe(
      'Email me at [REDACTED] please'
    );
  });

  it('redacts street addresses', () => {
    expect(filterOutput('I live at 123 Main Street in the city')).toBe(
      'I live at [REDACTED] in the city'
    );
  });

  it('redacts address with "Ave" abbreviation', () => {
    expect(filterOutput('Visit 45 Oak Avenue for the event')).toBe(
      'Visit [REDACTED] for the event'
    );
  });

  it('handles text with multiple PII types', () => {
    const result = filterOutput('Call 9876543210 or email me@test.com at 10 Park Road');
    expect(result).not.toContain('9876543210');
    expect(result).not.toContain('me@test.com');
    expect(result).toContain('[REDACTED]');
  });

  it('does not redact normal numbers that are not 10 digits', () => {
    expect(filterOutput('There are 42 cats in the park')).toBe('There are 42 cats in the park');
  });
});

describe('filterImagePrompt', () => {
  it('passes safe prompts through unchanged', () => {
    const prompt = 'A beautiful sunset over the ocean with dolphins';
    expect(filterImagePrompt(prompt)).toBe(prompt);
  });

  it('blocks "gun" (weapon)', () => {
    expect(() => filterImagePrompt('a person holding a gun')).toThrow("Let's try a different image idea");
  });

  it('blocks "weapon" (weapon)', () => {
    expect(() => filterImagePrompt('draw a weapon')).toThrow("Let's try a different image idea");
  });

  it('blocks "knife"', () => {
    expect(() => filterImagePrompt('a knife dripping')).toThrow("Let's try a different image idea");
  });

  it('blocks "blood" (violence)', () => {
    expect(() => filterImagePrompt('blood on the floor')).toThrow("Let's try a different image idea");
  });

  it('blocks "gore" (violence)', () => {
    expect(() => filterImagePrompt('a gore scene')).toThrow("Let's try a different image idea");
  });

  it('blocks "nude" (nudity)', () => {
    expect(() => filterImagePrompt('a nude figure')).toThrow("Let's try a different image idea");
  });

  it('blocks "naked" (nudity)', () => {
    expect(() => filterImagePrompt('a naked person')).toThrow("Let's try a different image idea");
  });

  it('blocks "sexy"', () => {
    expect(() => filterImagePrompt('a sexy character')).toThrow("Let's try a different image idea");
  });

  it('blocks "drug" (substances)', () => {
    expect(() => filterImagePrompt('a drug scene')).toThrow("Let's try a different image idea");
  });

  it('blocks "alcohol"', () => {
    expect(() => filterImagePrompt('a bottle of alcohol')).toThrow("Let's try a different image idea");
  });

  it('blocks "cigarette"', () => {
    expect(() => filterImagePrompt('smoking a cigarette')).toThrow("Let's try a different image idea");
  });

  it('blocks "smoking"', () => {
    expect(() => filterImagePrompt('a smoking character')).toThrow("Let's try a different image idea");
  });

  it('blocks "kill"', () => {
    expect(() => filterImagePrompt('kill the monster')).toThrow("Let's try a different image idea");
  });

  it('blocks "death"', () => {
    expect(() => filterImagePrompt('death and destruction')).toThrow("Let's try a different image idea");
  });

  it('is case insensitive', () => {
    expect(() => filterImagePrompt('A GUN on the table')).toThrow("Let's try a different image idea");
  });

  it('throws UNSAFE_CONTENT code', () => {
    try {
      filterImagePrompt('a gun');
      expect.fail('Should have thrown');
    } catch (error: unknown) {
      expect((error as { code: string }).code).toBe('UNSAFE_CONTENT');
    }
  });
});
