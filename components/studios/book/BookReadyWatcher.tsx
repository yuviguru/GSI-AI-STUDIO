'use client';

/**
 * BOOK-008 — global "your book is ready" watcher.
 *
 * Mounted in the (public) layout so a kid who wandered off the Book Studio — or
 * reloaded the tab — still gets alerted when a background generation finishes.
 *
 * It owns a self-contained poll loop (NOT SWR): while the `generatingSignal`
 * localStorage set is non-empty (or a live `/api/books` scan still shows an
 * in-flight book) it re-fetches every 2.5s, detects the generating → terminal
 * transition per book id, shows a dismissible toast that links into the finished
 * book, and clears the id from the signal. When nothing is generating it stops
 * polling entirely and only wakes on the same-tab CustomEvent / cross-tab
 * `storage` event that `markBookGenerating` fires. This avoids the SWR
 * shared-key / conditional-refreshInterval race where the watcher would go idle
 * and miss the completion update.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, X } from 'lucide-react';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { playSound } from '@/lib/sounds';
import {
  GENERATING_EVENT,
  GENERATING_KEY,
  getGeneratingBookIds,
  unmarkBookGenerating,
} from '@/lib/books/generatingSignal';
import type { BookListItem, BookGenerationStatus } from '@gsi/types';

const POLL_MS = 2500;

const isInFlight = (s?: BookGenerationStatus | null): boolean =>
  s === 'pending' || s === 'generating';
const isTerminal = (s?: BookGenerationStatus | null): s is 'complete' | 'partial' | 'failed' =>
  s === 'complete' || s === 'partial' || s === 'failed';

async function fetchBooks(): Promise<BookListItem[]> {
  const res = await fetchWithSession('/api/books');
  const json = await res.json();
  if (!json?.success) return [];
  return (json.data?.items ?? []) as BookListItem[];
}

interface ReadyToast {
  id: string;
  title: string;
  status: 'complete' | 'partial' | 'failed';
}

export function BookReadyWatcher() {
  // Last-seen generation status per book id — lets us fire exactly once on the
  // in-flight → terminal edge, and avoids alerting for books that were already
  // done before this watcher mounted.
  const prev = useRef<Map<string, BookGenerationStatus>>(new Map());
  const [toast, setToast] = useState<ReadyToast | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async (): Promise<void> => {
      if (!active) return;
      timer = null;

      let items: BookListItem[] = [];
      try {
        items = await fetchBooks();
      } catch {
        // Network blip — keep the loop alive if work is still tracked.
        if (active && getGeneratingBookIds().length > 0) timer = setTimeout(poll, POLL_MS);
        return;
      }

      const tracked = new Set(getGeneratingBookIds());
      const present = new Set(items.map((b) => b.id));

      for (const b of items) {
        const now = b.generation?.status ?? null;
        const before = prev.current.get(b.id);
        // Alert only for books we were actually watching: either explicitly
        // tracked (started/retried in this browser) or observed in-flight.
        const watched = tracked.has(b.id) || isInFlight(before);
        if (watched && isTerminal(now)) {
          setToast({ id: b.id, title: b.title, status: now });
          if (now !== 'failed') playSound('creationComplete');
          unmarkBookGenerating(b.id);
        }
        if (now) prev.current.set(b.id, now);
      }

      // A tracked id that no longer exists (deleted) must be dropped so the loop
      // can terminate.
      for (const id of tracked) if (!present.has(id)) unmarkBookGenerating(id);

      const keepPolling =
        getGeneratingBookIds().length > 0 ||
        items.some((b) => isInFlight(b.generation?.status));
      if (active && keepPolling) timer = setTimeout(poll, POLL_MS);
    };

    // Kick the loop only if it isn't already scheduled/running.
    const kick = (): void => {
      if (active && timer === null) timer = setTimeout(poll, 0);
    };

    // Seed `prev` once so we never false-alert for books that were already
    // terminal at mount, then start polling iff something is in flight (covers a
    // reload mid-generation, where the signal persists in localStorage).
    void (async () => {
      try {
        const items = await fetchBooks();
        for (const b of items) if (b.generation?.status) prev.current.set(b.id, b.generation.status);
      } catch {
        /* ignore seed failure */
      }
      if (getGeneratingBookIds().length > 0) kick();
    })();

    const onSignal = (): void => kick();
    const onStorage = (e: StorageEvent): void => {
      if (e.key === GENERATING_KEY) kick();
    };
    window.addEventListener(GENERATING_EVENT, onSignal);
    window.addEventListener('storage', onStorage);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener(GENERATING_EVENT, onSignal);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Auto-dismiss after 9s.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  const message =
    toast?.status === 'failed'
      ? 'had some trouble — tap to retry'
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
