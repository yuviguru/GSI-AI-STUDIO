import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GENERATING_EVENT,
  GENERATING_KEY,
  getGeneratingBookIds,
  markBookGenerating,
  unmarkBookGenerating,
} from './generatingSignal';

describe('generatingSignal', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('starts empty', () => {
    expect(getGeneratingBookIds()).toEqual([]);
  });

  it('marks a book and persists it', () => {
    markBookGenerating('book-1');
    expect(getGeneratingBookIds()).toEqual(['book-1']);
    expect(JSON.parse(window.localStorage.getItem(GENERATING_KEY) ?? '[]')).toEqual(['book-1']);
  });

  it('dedupes repeated marks', () => {
    markBookGenerating('book-1');
    markBookGenerating('book-1');
    markBookGenerating('book-2');
    expect(getGeneratingBookIds()).toEqual(['book-1', 'book-2']);
  });

  it('dispatches the wake event on every mark (even duplicates)', () => {
    const handler = vi.fn();
    window.addEventListener(GENERATING_EVENT, handler);
    markBookGenerating('book-1');
    markBookGenerating('book-1'); // already present, but should still wake the watcher
    window.removeEventListener(GENERATING_EVENT, handler);
    expect(handler).toHaveBeenCalledTimes(2);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toBe('book-1');
  });

  it('ignores empty ids', () => {
    markBookGenerating('');
    expect(getGeneratingBookIds()).toEqual([]);
  });

  it('unmarks a book', () => {
    markBookGenerating('book-1');
    markBookGenerating('book-2');
    unmarkBookGenerating('book-1');
    expect(getGeneratingBookIds()).toEqual(['book-2']);
  });

  it('unmark is a no-op for unknown ids', () => {
    markBookGenerating('book-1');
    unmarkBookGenerating('nope');
    expect(getGeneratingBookIds()).toEqual(['book-1']);
  });

  it('survives corrupt localStorage data', () => {
    window.localStorage.setItem(GENERATING_KEY, '{not json');
    expect(getGeneratingBookIds()).toEqual([]);
    // and can still record new work over the corrupt value
    markBookGenerating('book-1');
    expect(getGeneratingBookIds()).toEqual(['book-1']);
  });

  it('filters non-string entries from stored data', () => {
    window.localStorage.setItem(GENERATING_KEY, JSON.stringify(['ok', 42, null, 'two']));
    expect(getGeneratingBookIds()).toEqual(['ok', 'two']);
  });
});
