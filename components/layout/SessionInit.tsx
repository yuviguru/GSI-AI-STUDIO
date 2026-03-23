'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';

const MIGRATION_KEY = 'gsi-points-migrated';
const SESSION_KEY = 'gsi-session-id';
const POINTS_KEY = 'gsi-ai-points';
const CLAIM_KEY = 'gsi-session-claimed';

/**
 * Isolates session initialization into its own component so that
 * useSession state updates (e.g. cooldown timer ticks) don't cause
 * the entire PublicLayout tree to re-render.
 *
 * Also performs:
 * 1. One-time migration of localStorage AI points to Firestore (Phase 1 legacy)
 * 2. Auto-claim of anonymous session when user authenticates (Phase 2)
 */
export function SessionInit() {
  useSession();

  const { isAuthenticated, getIdToken } = useAuth();
  const claimAttempted = useRef(false);

  // ── Phase 1 legacy: localStorage → Firestore points migration ─────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const storedPoints = parseInt(localStorage.getItem(POINTS_KEY) ?? '0', 10);
    if (storedPoints <= 0) {
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
      .then((response) => {
        if (response.ok) {
          localStorage.setItem(MIGRATION_KEY, '1');
        }
      })
      .catch(() => {
        // Network error — non-blocking, will retry on next page load
      });
  }, []);

  // ── Phase 2: Auto-claim anonymous session on authentication ───────────
  useEffect(() => {
    if (!isAuthenticated) return;
    if (claimAttempted.current) return;

    // Check if we've already claimed this session
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    const alreadyClaimed = localStorage.getItem(CLAIM_KEY);
    if (alreadyClaimed === sessionId) return;

    claimAttempted.current = true;

    async function claimSession() {
      try {
        const token = await getIdToken();
        if (!token) return;

        const res = await fetch('/api/auth/claim-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        if (res.ok) {
          localStorage.setItem(CLAIM_KEY, sessionId!);
        }
      } catch {
        // Non-blocking — will retry on next page load
        claimAttempted.current = false;
      }
    }

    claimSession();
  }, [isAuthenticated, getIdToken]);

  return null;
}
