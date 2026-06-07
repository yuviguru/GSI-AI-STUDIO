'use client';

/**
 * BOOK-008 — client-side "a book is generating" signal.
 *
 * The async generation pipeline returns instantly and renders the book in the
 * background, so the UI needs a durable way to know a generation is in flight —
 * one that survives route changes AND a full page reload (a kid might close the
 * tab mid-generation and come back). We can't lean on a React/SWR in-memory flag
 * for that, so the source of truth is a small localStorage set of book ids.
 *
 * `BookReadyWatcher` polls `/api/books` while this set is non-empty and clears an
 * id once its book reaches a terminal status. A same-tab CustomEvent + the native
 * cross-tab `storage` event let the watcher wake up the instant a generation
 * starts instead of waiting for its next idle tick.
 */

const KEY = 'gsi-books-generating';
const EVENT = 'gsi:book-generating';

/** localStorage key holding the JSON array of in-flight book ids. */
export const GENERATING_KEY = KEY;
/** Same-tab DOM event fired whenever the in-flight set changes. */
export const GENERATING_EVENT = EVENT;

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // localStorage unavailable (private mode / quota) — the watcher falls back
    // to its in-flight scan, so this is non-fatal.
  }
}

/** Book ids whose background generation has not yet been observed finishing. */
export function getGeneratingBookIds(): string[] {
  return read();
}

/**
 * Record that `id` is generating and wake any mounted watcher. Always dispatches
 * the event (even if the id was already present) so a re-submit / retry re-kicks
 * the poll loop.
 */
export function markBookGenerating(id: string): void {
  if (!id || typeof window === 'undefined') return;
  const ids = read();
  if (!ids.includes(id)) {
    ids.push(id);
    write(ids);
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
  } catch {
    // CustomEvent unsupported — the watcher's idle heartbeat still catches it.
  }
}

/** Drop `id` from the in-flight set once its book has reached a terminal status. */
export function unmarkBookGenerating(id: string): void {
  if (typeof window === 'undefined') return;
  const next = read().filter((x) => x !== id);
  write(next);
}
