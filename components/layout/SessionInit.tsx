'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { ONBOARDING_PROFILE_STORAGE_KEY } from '@/hooks/useOnboardingProfile';

const MIGRATION_KEY = 'gsi-points-migrated';
const SESSION_KEY = 'gsi-session-id';
const POINTS_KEY = 'gsi-ai-points';
const CLAIM_KEY = 'gsi-session-claimed';

interface ClaimOnboardingPayload {
  name?: string;
  age?: number;
  mascotId?: string;
  avatarUrl?: string;
}

function readOnboardingForClaim(): ClaimOnboardingPayload | undefined {
  try {
    const raw = localStorage.getItem(ONBOARDING_PROFILE_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const payload: ClaimOnboardingPayload = {};
    if (typeof parsed.name === 'string' && parsed.name.trim()) payload.name = parsed.name.trim();
    if (typeof parsed.age === 'number') payload.age = parsed.age;
    if (typeof parsed.mascotId === 'string') payload.mascotId = parsed.mascotId;
    if (typeof parsed.avatarUrl === 'string' && parsed.avatarUrl.length < 2048) {
      // Skip data: URIs — too large to send and they're not migratable.
      // The avatarUrl set during pilot/login-only flow will be a Storage URL.
      if (!parsed.avatarUrl.startsWith('data:')) payload.avatarUrl = parsed.avatarUrl;
    }
    return Object.keys(payload).length > 0 ? payload : undefined;
  } catch {
    return undefined;
  }
}

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

    fetchWithSession('/api/sessions/points', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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

        const onboarding = readOnboardingForClaim();

        const res = await fetch('/api/auth/claim-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId,
            ...(onboarding ? { onboarding } : {}),
          }),
        });

        if (res.ok) {
          localStorage.setItem(CLAIM_KEY, sessionId!);
        } else {
          // Allow retry — claim-session now auto-creates the user doc itself,
          // so 404 should be impossible. Network blips might still happen.
          claimAttempted.current = false;
        }
      } catch {
        // Network error — will retry on next page load
        claimAttempted.current = false;
      }
    }

    claimSession();
  }, [isAuthenticated, getIdToken]);

  return null;
}
