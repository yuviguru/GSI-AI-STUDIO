/**
 * Pre-publish book validation (BOOK-009).
 *
 * Even though pages can start AI-generated, the kid edits freely — they can
 * delete text, clear a picture, or leave a fresh page blank. Before a book is
 * published we check that every page is actually "finished enough" so the
 * published/printed book reads properly:
 *  - blocking: a totally empty page (no words, no picture, no colour) or a
 *    missing cover title — these stop publishing.
 *  - warnings: a page with a picture/colour but no words yet, or a page with
 *    only a stray character — surfaced so the kid can decide, but not blocking.
 *
 * Pure + render-agnostic so the editor (Publish modal) and any server-side
 * publish guard can share one source of truth.
 */

import type { Book, BookPage } from '@gsi/types';

export interface BookIssue {
  /** 1-based page number, or undefined for book-level issues (e.g. the cover). */
  pageNumber?: number;
  message: string;
}

export interface BookValidationResult {
  ok: boolean;
  blocking: BookIssue[];
  warnings: BookIssue[];
}

/** Minimum trimmed text length below which a "text" page is treated as basically empty. */
const MIN_MEANINGFUL_TEXT = 2;

export function validateBookForPublish(book: Book, pages: BookPage[]): BookValidationResult {
  const blocking: BookIssue[] = [];
  const warnings: BookIssue[] = [];

  if (!book.cover?.title?.trim()) {
    blocking.push({ message: 'Give your book a cover title.' });
  }

  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  if (sorted.length < 1) {
    blocking.push({ message: 'Add at least one page.' });
  }

  for (const page of sorted) {
    const textLen = (page.plainText ?? '').trim().length;
    const hasText = textLen >= MIN_MEANINGFUL_TEXT;
    const hasPicture = !!page.imageUrl;
    const hasColour = !!page.style?.backgroundColor;

    if (!hasText && !hasPicture && !hasColour) {
      blocking.push({
        pageNumber: page.pageNumber,
        message: `Page ${page.pageNumber} is empty — add words, a picture, or a plain colour.`,
      });
      continue;
    }

    if (!hasText && (hasPicture || hasColour)) {
      warnings.push({
        pageNumber: page.pageNumber,
        message: `Page ${page.pageNumber} has no words yet.`,
      });
    } else if (textLen > 0 && textLen < MIN_MEANINGFUL_TEXT) {
      warnings.push({
        pageNumber: page.pageNumber,
        message: `Page ${page.pageNumber} has barely any text.`,
      });
    }
  }

  return { ok: blocking.length === 0, blocking, warnings };
}
