import { describe, it, expect } from 'vitest';
import { wordErrorRate, accuracyFromWer } from './recitationScorer';

describe('wordErrorRate', () => {
  it('returns 0 when expected and actual match exactly', () => {
    expect(wordErrorRate('the cat sat on the mat', 'the cat sat on the mat')).toBe(0);
  });

  it('is case-insensitive and tolerant of punctuation', () => {
    expect(wordErrorRate('The Cat SAT on the mat!', 'the cat sat on the mat')).toBe(0);
  });

  it('reports one edit per differing word', () => {
    // 1 substitution out of 6 expected words → WER ≈ 0.1667
    expect(wordErrorRate('the cat sat on the mat', 'the cat sat on a mat')).toBeCloseTo(
      1 / 6,
      5,
    );
  });

  it('clamps to 1 when actual is empty', () => {
    expect(wordErrorRate('hello there', '')).toBe(1);
  });

  it('returns 0 when expected is empty and actual is empty', () => {
    expect(wordErrorRate('', '')).toBe(0);
  });

  it('returns 1 when expected is empty but actual has words (all insertions)', () => {
    expect(wordErrorRate('', 'hello')).toBe(1);
  });

  it('handles Hindi Devanagari text', () => {
    expect(wordErrorRate('नमस्ते दुनिया', 'नमस्ते दुनिया')).toBe(0);
    // Devanagari combining marks (virama, vowel signs) tokenise differently
    // from Latin; we only assert "substantially different" here, not an
    // exact ratio. The real value is the determinism — same input, same
    // output — not the precise WER number across scripts.
    expect(wordErrorRate('नमस्ते दुनिया', 'नमस्कार दुनिया')).toBeGreaterThan(0);
    expect(wordErrorRate('नमस्ते दुनिया', 'नमस्कार दुनिया')).toBeLessThan(1);
  });
});

describe('accuracyFromWer', () => {
  it('converts 0 WER → 100%', () => {
    expect(accuracyFromWer(0)).toBe(100);
  });

  it('converts 1 WER → 0%', () => {
    expect(accuracyFromWer(1)).toBe(0);
  });

  it('clamps WER above 1', () => {
    expect(accuracyFromWer(2)).toBe(0);
  });

  it('clamps WER below 0', () => {
    expect(accuracyFromWer(-0.5)).toBe(100);
  });

  it('rounds to integer', () => {
    expect(accuracyFromWer(0.333)).toBe(67);
  });
});
