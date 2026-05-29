'use client';

import { useState } from 'react';
import { fetchWithSession } from '@/lib/fetchWithSession';
import {
  handleBillingApiError,
  useBillingNotifications,
} from '@/contexts/BillingNotificationContext';
import type { BookFormat, BookSize, BookType } from '@gsi/types';

export interface BookGenerateInput {
  topic: string;
  age: number;
  style: 'funny' | 'brave' | 'silly' | 'scary' | 'sweet' | 'mysterious';
  type: BookType;
  format: BookFormat;
  size: BookSize;
  pageCount: number;
  title?: string;
  author?: string;
}

export interface BookGenerateResult {
  bookId: string;
  redirectUrl: string;
  pagesGenerated: number;
  pagesWithImages: number;
}

/**
 * Hook: drives the BOOK-002 AI-generate flow. Single POST to
 * /api/ai/book-generate. Returns the created book id + redirect URL.
 *
 * Loading is the biggest UX risk — the call takes 15-30s while Claude
 * drafts + images render. The consuming form should show a mascot
 * thinking animation and copy that sets expectations.
 */
export function useBookGenerate() {
  const { show: showBillingNotification } = useBillingNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (input: BookGenerateInput): Promise<BookGenerateResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithSession('/api/ai/book-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) {
        if (handleBillingApiError(res.status, json, showBillingNotification)) return null;
        throw new Error(json.error?.message ?? 'Could not generate your book');
      }
      return json.data as BookGenerateResult;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate your book');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setError(null);

  return { loading, error, generate, reset };
}
