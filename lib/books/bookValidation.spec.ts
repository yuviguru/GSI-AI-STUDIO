import { describe, it, expect } from 'vitest';
import type { Book, BookPage } from '@gsi/types';
import { validateBookForPublish } from './bookValidation';

function makeBook(over: Partial<Book> = {}): Book {
  return {
    cover: { title: 'My Book' },
    pageCount: 1,
    ...over,
  } as unknown as Book;
}

function makePage(over: Partial<BookPage> = {}): BookPage {
  return {
    id: over.id ?? 'p1',
    pageNumber: over.pageNumber ?? 1,
    plainText: '',
    imageUrl: null,
    style: null,
    ...over,
  } as unknown as BookPage;
}

describe('validateBookForPublish (BOOK-009)', () => {
  it('passes a book whose pages all have words or pictures', () => {
    const res = validateBookForPublish(makeBook(), [
      makePage({ pageNumber: 1, plainText: 'Once upon a time.' }),
      makePage({ pageNumber: 2, imageUrl: 'https://img/x.jpg', plainText: 'The end.' }),
    ]);
    expect(res.ok).toBe(true);
    expect(res.blocking).toHaveLength(0);
  });

  it('blocks publishing when a page is completely empty', () => {
    const res = validateBookForPublish(makeBook(), [
      makePage({ pageNumber: 1, plainText: 'Hi.' }),
      makePage({ pageNumber: 2 }), // empty: no text, no image, no colour
    ]);
    expect(res.ok).toBe(false);
    expect(res.blocking.some((i) => i.pageNumber === 2)).toBe(true);
  });

  it('treats a plain-colour page as a valid (non-empty) page', () => {
    const res = validateBookForPublish(makeBook(), [
      makePage({ pageNumber: 1, plainText: 'Story.' }),
      makePage({ pageNumber: 2, imageUrl: null, style: { backgroundColor: '#FFF8E7' } }),
    ]);
    // The colour page has no words → a warning, but it is NOT blocking.
    expect(res.ok).toBe(true);
    expect(res.warnings.some((i) => i.pageNumber === 2)).toBe(true);
  });

  it('warns about a picture page with no words yet', () => {
    const res = validateBookForPublish(makeBook(), [
      makePage({ pageNumber: 1, imageUrl: 'https://img/x.jpg' }),
    ]);
    expect(res.ok).toBe(true);
    expect(res.warnings).toHaveLength(1);
  });

  it('blocks when the cover has no title', () => {
    const res = validateBookForPublish(makeBook({ cover: { title: '' } as Book['cover'] }), [
      makePage({ pageNumber: 1, plainText: 'Hello.' }),
    ]);
    expect(res.ok).toBe(false);
    expect(res.blocking.some((i) => i.message.toLowerCase().includes('title'))).toBe(true);
  });
});
