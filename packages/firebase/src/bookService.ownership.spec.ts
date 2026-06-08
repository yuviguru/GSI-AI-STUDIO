import { describe, it, expect } from 'vitest';
import { effectiveKidId, ownsBook } from './bookService';

/**
 * Regression tests for the "lost books" bug: a kid's session id rolls over
 * every day (`kid-<kidId>-<YYYY-MM-DD>`), so listing/owning books by session id
 * hid every book not created today. Books are now owned DURABLY by kidId.
 */

describe('effectiveKidId', () => {
  it('returns the explicit kidId when the scope carries one', () => {
    expect(effectiveKidId({ sessionId: 'anything', kidId: 'KID123' })).toBe('KID123');
  });

  it('recovers the kidId from a kid-scoped session id', () => {
    expect(effectiveKidId({ sessionId: 'kid-DklYowISEVPc6lQ1B7JF-2026-06-08' })).toBe(
      'DklYowISEVPc6lQ1B7JF',
    );
  });

  it('returns null for an anonymous UUID session', () => {
    expect(effectiveKidId({ sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789' })).toBeNull();
  });

  it('returns null for a malformed kid- id with no kidId segment', () => {
    expect(effectiveKidId({ sessionId: 'kid-' })).toBeNull();
  });
});

describe('ownsBook', () => {
  const scopeToday = { sessionId: 'kid-JOY-2026-06-08' };

  it('matches a kid across DIFFERENT daily sessions — the core fix', () => {
    // Book was created YESTERDAY; the current scope is today's session. Under
    // the old sessionId-only check this returned false and the book vanished.
    const yesterdaysBook = { sessionId: 'kid-JOY-2026-06-07', kidId: 'JOY' };
    expect(ownsBook(yesterdaysBook, scopeToday)).toBe(true);
  });

  it('matches when the scope carries an explicit kidId', () => {
    const book = { sessionId: 'kid-JOY-2026-06-08', kidId: 'JOY' };
    expect(ownsBook(book, { sessionId: 'unrelated', kidId: 'JOY' })).toBe(true);
  });

  it('rejects a book belonging to a different kid', () => {
    const othersBook = { sessionId: 'kid-OTHER-2026-06-08', kidId: 'OTHER' };
    expect(ownsBook(othersBook, scopeToday)).toBe(false);
  });

  it('falls back to sessionId for anonymous books that have no kidId', () => {
    const anonScope = { sessionId: 'uuid-anon-1' };
    expect(ownsBook({ sessionId: 'uuid-anon-1' }, anonScope)).toBe(true);
    expect(ownsBook({ sessionId: 'uuid-anon-2' }, anonScope)).toBe(false);
  });
});
