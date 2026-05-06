'use client';

import { useState } from 'react';
import { fetchWithSession } from '@/lib/fetchWithSession';
import type { BookPage } from '@/types/book.types';
import type { PageCreateInput, PagePatchInput, PageReorderInput } from '@/lib/validators';

/**
 * Page-level mutations for a book. Pages themselves are fetched as part of
 * `useBook(bookId)` and revalidated via the `refresh` callback this hook
 * accepts (the editor passes useBook's refresh to keep the cache in sync).
 */
export function useBookPages(bookId: string | null, onChange: () => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      await onChange();
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Page action failed';
      setError(msg);
      // Also log to the console so the kid (or us testing) can see WHY in
      // devtools when the inline banner gets dismissed or missed.
      console.error('[useBookPages] action failed:', msg, e);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const appendPage = (input: PageCreateInput) =>
    run(async () => {
      if (!bookId) throw new Error('No book');
      const res = await fetchWithSession(`/api/books/${bookId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to add page');
      return json.data as { page: BookPage; pageNumber: number };
    });

  const patchPage = (pageId: string, patch: PagePatchInput) =>
    run(async () => {
      if (!bookId) throw new Error('No book');
      const res = await fetchWithSession(`/api/books/${bookId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to update page');
      return json.data.page as BookPage;
    });

  const deletePage = (pageId: string) =>
    run(async () => {
      if (!bookId) throw new Error('No book');
      const res = await fetchWithSession(`/api/books/${bookId}/pages/${pageId}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? 'Delete failed');
      }
      return true as const;
    });

  const reorderPages = (order: PageReorderInput['order']) =>
    run(async () => {
      if (!bookId) throw new Error('No book');
      const res = await fetchWithSession(`/api/books/${bookId}/pages/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Reorder failed');
      return true as const;
    });

  return {
    busy,
    error,
    appendPage,
    patchPage,
    deletePage,
    reorderPages,
  };
}
