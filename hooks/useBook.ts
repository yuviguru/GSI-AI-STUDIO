'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetchWithSession } from '@/lib/fetchWithSession';
import type { Book, BookPage } from '@gsi/types';
import type { BookPatchInput, CoverPatchInput } from '@/lib/validators';
import {
  handleBillingApiError,
  useBillingNotifications,
} from '@/contexts/BillingNotificationContext';

interface BookFetchResponse {
  book: Book;
  pages: BookPage[];
}

const bookFetcher = async (url: string): Promise<BookFetchResponse> => {
  const res = await fetchWithSession(url);
  if (res.status === 404) {
    const err = new Error('Book not found') as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Failed to load book');
  return json.data;
};

/**
 * Fetch a single book + its pages. Returns mutation helpers for metadata,
 * cover, publish, PDF export, and delete. Page-level mutations are split
 * into a separate hook (`useBookPages`).
 */
export function useBook(bookId: string | null) {
  const { show: showBillingNotification } = useBillingNotifications();
  const { data, error, isLoading, mutate } = useSWR<BookFetchResponse>(
    bookId ? `/api/books/${bookId}` : null,
    bookFetcher
  );

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setActionLoading(true);
    setActionError(null);
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      setActionError(msg);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const patchBook = (patch: BookPatchInput) =>
    runAction(async () => {
      const res = await fetchWithSession(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Update failed');
      await mutate();
      return json.data.book as Book;
    });

  const deleteBook = () =>
    runAction(async () => {
      const res = await fetchWithSession(`/api/books/${bookId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? 'Delete failed');
      }
      return true as const;
    });

  const updateCover = (cover: CoverPatchInput) =>
    runAction(async () => {
      const res = await fetchWithSession(`/api/books/${bookId}/cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cover),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Cover update failed');
      await mutate();
      return json.data.book as Book;
    });

  const publishBook = (isPublic = false) =>
    runAction(async () => {
      const res = await fetchWithSession(`/api/books/${bookId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Publish failed');
      await mutate();
      return json.data as { book: Book; shareUrl: string | null; pdfUrl: string | null };
    });

  const exportPdf = () =>
    runAction(async () => {
      const res = await fetchWithSession(`/api/books/${bookId}/export-pdf`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) {
        // PDF export is a `canExportPdf` Pro capability — surface the
        // upgrade modal instead of a silent error banner.
        if (handleBillingApiError(res.status, json, showBillingNotification)) {
          return null;
        }
        throw new Error(json.error?.message ?? 'PDF generation failed');
      }
      return json.data as { pdfUrl: string; sizeBytes: number; generatedAt: string };
    });

  const notFound = error instanceof Error && (error as Error & { status?: number }).status === 404;

  return {
    book: data?.book ?? null,
    pages: data?.pages ?? [],
    isLoading,
    notFound,
    error: error instanceof Error ? error.message : null,
    actionLoading,
    actionError,
    patchBook,
    deleteBook,
    updateCover,
    publishBook,
    exportPdf,
    refresh: mutate,
  };
}
