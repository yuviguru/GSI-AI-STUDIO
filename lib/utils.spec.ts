import { describe, it, expect } from 'vitest';
import { generateSessionId, formatCount, friendlyError, cn } from './utils';

describe('generateSessionId', () => {
  it('returns a string', () => {
    expect(typeof generateSessionId()).toBe('string');
  });

  it('returns the mocked UUID from vitest.setup.ts', () => {
    // crypto.randomUUID is mocked in vitest.setup.ts
    expect(generateSessionId()).toBe('test-uuid-1234-5678-9abc-def012345678');
  });
});

describe('formatCount', () => {
  it('formats 0', () => {
    expect(formatCount(0)).toBe('0');
  });

  it('formats 999 as-is', () => {
    expect(formatCount(999)).toBe('999');
  });

  it('formats 1000 as 1.0K', () => {
    expect(formatCount(1000)).toBe('1.0K');
  });

  it('formats 1500 as 1.5K', () => {
    expect(formatCount(1500)).toBe('1.5K');
  });

  it('formats 10000 as 10.0K', () => {
    expect(formatCount(10000)).toBe('10.0K');
  });

  it('formats small numbers as plain strings', () => {
    expect(formatCount(42)).toBe('42');
  });
});

describe('friendlyError', () => {
  it('returns kid-friendly message for RATE_LIMITED', () => {
    expect(friendlyError('RATE_LIMITED')).toContain('creating too fast');
  });

  it('returns kid-friendly message for UNSAFE_CONTENT', () => {
    expect(friendlyError('UNSAFE_CONTENT')).toContain('different idea');
  });

  it('returns kid-friendly message for AI_GENERATION_FAILED', () => {
    expect(friendlyError('AI_GENERATION_FAILED')).toContain('AI got confused');
  });

  it('returns kid-friendly message for CREATION_LIMIT', () => {
    expect(friendlyError('CREATION_LIMIT')).toContain('amazing things today');
  });

  it('returns kid-friendly message for SESSION_EXPIRED', () => {
    expect(friendlyError('SESSION_EXPIRED')).toContain('session ended');
  });

  it('returns kid-friendly message for NOT_FOUND', () => {
    expect(friendlyError('NOT_FOUND')).toContain("couldn't find");
  });

  it('returns default message for unknown code', () => {
    expect(friendlyError('UNKNOWN_CODE')).toContain('Something went wrong');
  });
});

describe('cn', () => {
  it('merges tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});
