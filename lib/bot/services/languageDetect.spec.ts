import { describe, it, expect } from 'vitest';
import { detectLanguage } from './languageDetect';

describe('detectLanguage', () => {
  it('returns "en" for English text', () => {
    expect(detectLanguage('The quick brown fox jumps over the lazy dog.')).toBe('en');
  });

  it('returns "hi" for Hindi Devanagari text', () => {
    expect(detectLanguage('मेरा नाम राम है। आज का पाठ पढ़िए।')).toBe('hi');
  });

  it('returns "hi" for Hindi-majority mixed text', () => {
    // Mostly Devanagari with a couple of English tokens — still Hindi.
    expect(detectLanguage('कक्षा 5 गणित homework है।')).toBe('hi');
  });

  it('returns "en" for English-majority mixed text', () => {
    // Mostly English with a single Hindi word.
    expect(detectLanguage('Class 5 Math homework: solve these — नमस्ते.')).toBe('en');
  });

  it('defaults to "en" for short / empty strings', () => {
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage('hi')).toBe('en');
    expect(detectLanguage('   ')).toBe('en');
  });

  it('defaults to "en" when input has no letters at all', () => {
    expect(detectLanguage('12345 !!!')).toBe('en');
  });
});
