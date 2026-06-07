'use client';

/**
 * BOOK-008 — global "your book is ready" watcher.
 *
 * Mounted in the (public) layout so a kid who wandered off the Book Studio
 * still gets alerted when a background generation finishes. Polls `/api/books`
 * ONLY while something is generating (shares SWR's cache with useBookList, so no
 * extra requests), detects the generating → complete/partial/failed transition,
 * and shows a dismissible toast that links straight into the finished book.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, X } from 'lucide-react';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { playSound } from '@/lib/sounds';
import type { BookListItem, BookGenerationStatus } from '@gsi/types';

interface BooksResponse {
  items: BookListItem[];
}

const fetcher = async (url: string): Promise<BooksResponse> => {
  const res = await fetchWithSession(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Failed to load books');
  return json.data;
};

const isInFlight = (s?: BookGenerationStatus | null) => s === 'pending' || s === 'generating';

interface ReadyToast {
  id: string;
  title: string;
  status: 'complete' | 'partial' | 'failed';
}

export function BookReadyWatcher() {
  const prev = useRef<Map<string, BookGenerationStatus>>(new Map());
  const seeded = useRef(false);
  const [toast, setToast] = useState<ReadyToast | null>(null);

  const { data } = useSWR<BooksResponse>('/api/books', fetcher, {
    refreshInterval: (latest) =>
      latest?.items?.some((b) => isInFlight(b.generation?.status)) ? 2500 : 0,
  });

  useEffect(() => {
    const items = data?.items ?? [];
    // First load just records current statuses — don't alert for books that
    // were already done before this page mounted.
    if (!seeded.current) {
      for (const b of items) if (b.generation?.status) prev.current.set(b.id, b.generation.status);
      seeded.current = true;
      return;
    }
    for (const b of items) {
      const before = prev.current.get(b.id);
      const now = b.generation?.status;
      if (
        isInFlight(before) &&
        (now === 'complete' || now === 'partial' || now === 'failed')
      ) {
        setToast({ id: b.id, title: b.title, status: now });
        if (now !== 'failed') playSound('creationComplete');
      }
      if (now) prev.current.set(b.id, now);
    }
  }, [data]);

  // Auto-dismiss after 9s.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  const message =
    toast?.status === 'failed'
      ? "had some trouble — tap to retry"
      : toast?.status === 'partial'
        ? 'is ready (a few pictures need a redraw)'
        : 'is ready! 🎉';

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          className="fixed bottom-4 left-1/2 z-[60] w-[min(92vw,360px)] -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0"
        >
          <Link
            href={`/create/book/${toast.id}`}
            onClick={() => setToast(null)}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-elevated ring-1 ring-amber-200 transition-transform hover:scale-[1.02]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-bold text-gray-900">
                “{toast.title}” {message}
              </p>
              <p className="text-[11px] font-medium text-amber-600">Tap to open</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={(e) => {
                e.preventDefault();
                setToast(null);
              }}
              className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
