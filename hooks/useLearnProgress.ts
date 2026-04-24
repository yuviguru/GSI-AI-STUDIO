'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CardId } from '@/lib/learn/cards';

const STORAGE_KEY = 'gsi-learn-visited';

function readVisited(): Set<CardId> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed as CardId[]);
  } catch {
    return new Set();
  }
}

function writeVisited(set: Set<CardId>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // localStorage quota — safe to swallow; next load just re-inits.
  }
}

/**
 * AI Lab visited-card progress — decision L2 says the gating is soft
 * and lives client-side. No Firestore writes; backend does not know
 * which cards a kid has "read". A small `storage` event listener
 * keeps multiple tabs in sync.
 */
export function useLearnProgress() {
  const [visited, setVisited] = useState<Set<CardId>>(() => new Set());

  useEffect(() => {
    setVisited(readVisited());
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setVisited(readVisited());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markVisited = useCallback((id: CardId) => {
    setVisited((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      writeVisited(next);
      return next;
    });
  }, []);

  return { visited, markVisited };
}
