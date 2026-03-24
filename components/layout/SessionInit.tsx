'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';

const MIGRATION_KEY = 'gsi-points-migrated';
const SESSION_KEY = 'gsi-session-id';
const POINTS_KEY = 'gsi-ai-points';
const SESSION_CLAIMED_KEY = 'gsi-session-claimed';

/**
 * Isolates session initialization into its own component so that
 * useSession state updates (e.g. cooldown timer ticks) don't cause
 * the entire PublicLayout tree to re-render.
 *
 * Also performs:
 * 1. One-time migration of localStorage AI points to Firestore
 * 2. Auto-claim of anonymous session when user authenticates
 */
export function SessionInit() {
  useSession();

  const { isAuthenticated, getIdToken } = useAuth();
  const claimAttempted = useRef(false);

  // One-time localStorage → Firestore points migration
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

  // Auto-claim anonymous session after authentication
  useEffect(() => {
    if (!isAuthenticated || claimAttempted.current) return;

    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    // Check if already claimed for this session
    const claimedSession = localStorage.getItem(SESSION_CLAIMED_KEY);
    if (claimedSession === sessionId) return;

    claimAttempted.current = true;

    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;

        const response = await fetch('/api/auth/claim-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        if (response.ok) {
          localStorage.setItem(SESSION_CLAIMED_KEY, sessionId);
        }
      } catch {
        // Non-blocking — will retry on next page load
        claimAttempted.current = false;
      }
    })();
  }, [isAuthenticated, getIdToken]);

  return null;
}
