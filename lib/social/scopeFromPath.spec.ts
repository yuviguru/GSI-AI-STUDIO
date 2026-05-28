import { describe, it, expect } from 'vitest';
import { scopeFromPath, scopeLabel } from './scopeFromPath';

describe('scopeFromPath', () => {
  it('maps home to global', () => {
    expect(scopeFromPath('/')).toBe('global');
    expect(scopeFromPath('')).toBe('global');
    expect(scopeFromPath(null)).toBe('global');
    expect(scopeFromPath(undefined)).toBe('global');
  });

  it('maps /create/<studio> to the studio', () => {
    expect(scopeFromPath('/create/book')).toBe('book');
    expect(scopeFromPath('/create/story')).toBe('story');
    expect(scopeFromPath('/create/music')).toBe('music');
    expect(scopeFromPath('/create/quiz')).toBe('quiz');
    expect(scopeFromPath('/create/comic')).toBe('comic');
    expect(scopeFromPath('/create/game')).toBe('game');
  });

  it('keeps the studio scope through deeper paths', () => {
    expect(scopeFromPath('/create/book/abc123')).toBe('book');
    expect(scopeFromPath('/create/book/abc123/edit')).toBe('book');
  });

  it('maps /shop/books to book scope', () => {
    expect(scopeFromPath('/shop/books')).toBe('book');
    expect(scopeFromPath('/shop/books/')).toBe('book');
  });

  it('maps /view/book/<slug> to book scope', () => {
    expect(scopeFromPath('/view/book/dragon-tale')).toBe('book');
  });

  it('falls back to global for unknown paths', () => {
    expect(scopeFromPath('/explore')).toBe('global');
    expect(scopeFromPath('/royalties')).toBe('global');
    expect(scopeFromPath('/billing/credits')).toBe('global');
    expect(scopeFromPath('/create/unknown-studio')).toBe('global');
  });
});

describe('scopeLabel', () => {
  it('returns empty for global (so the pill reads "12 online" not "12 Online")', () => {
    expect(scopeLabel('global')).toBe('');
  });

  it('returns short capitalised studio names', () => {
    expect(scopeLabel('book')).toBe('Books');
    expect(scopeLabel('story')).toBe('Stories');
    expect(scopeLabel('music')).toBe('Music');
    expect(scopeLabel('quiz')).toBe('Quiz');
    expect(scopeLabel('comic')).toBe('Comics');
    expect(scopeLabel('game')).toBe('Games');
  });
});
