'use client';

import { useEffect } from 'react';
import { useSession } from '@/hooks/useSession';

const MIGRATION_KEY = 'gsi-points-migrated';
const SESSION_KEY = 'gsi-session-id';
const POINTS_KEY = 'gsi-ai-points';

/**
 * Isolates session initialization into its own component so that
 * useSession state updates (e.g. cooldown timer ticks) don't cause
 * the entire PublicLayout tree to re-render.
 *
 * Also performs a one-time migration of localStorage AI points to
 * Firestore so existing users don't lose their progress.
 */
export function SessionInit() {
  useSession();

  // One-time localStorage → Firestore points migration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const storedPoints = parseInt(localStorage.getItem(POINTS_KEY) ?? '0', 10);
    if (storedPoints <= 0) {
      // Nothing to migrate — mark done
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    fetch('/api/sessions/points', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify({ action: 'add_points', points: storedPoints }),
    })
      .then(() => {
        localStorage.setItem(MIGRATION_KEY, '1');
      })
      .catch(() => {
        // Non-blocking — will retry on next page load until migration_key is set
      });
  }, []);

  return null;
}
