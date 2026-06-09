'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetchWithSession } from '@/lib/fetchWithSession';
import type { Book, BookListItem, BookStatus } from '@gsi/types';
import type { BookCreateInput } from '@/lib/validators';

interface BookListResponse {
  items: BookListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

const listFetcher = async (url: string): Promise<BookListResponse> => {
  const res = await fetchWithSession(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Failed to load books');
  return json.data;
};

/**
 * Fetch the current session's books with optional status filter. Used by
 * the Book Studio library view. `createBook` POSTs the wizard input and
 * revalidates the list.
 */
export function useBookList(filters?: { status?: BookStatus }) {
  const url = '/api/books' + (filters?.status ? `?status=${filters.status}` : '');
  const { data, error, isLoading, mutate } = useSWR<BookListResponse>(url, listFetcher, {
    // Poll while any book is still generating so the progress tile updates live
    // (BOOK-008). Stops once everything is complete / partial / failed.
    refreshInterval: (latest) =>
      latest?.items?.some(
        (b) => b.generation?.status === 'pending' || b.generation?.status === 'generating',
      )
        ? 2500
        : 0,
  });

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createBook = async (input: BookCreateInput): Promise<Book | null> => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetchWithSession('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Failed to create book');
      }
      await mutate();
      return json.data.book as Book;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create book';
      setCreateError(msg);
      return null;
    } finally {
      setCreating(false);
    }
  };

  return {
    items: data?.items ?? [],
    nextCursor: data?.nextCursor ?? null,
    hasMore: data?.hasMore ?? false,
    isLoading,
    error: error instanceof Error ? error.message : null,
    creating,
    createError,
    createBook,
    refresh: mutate,
  };
}
