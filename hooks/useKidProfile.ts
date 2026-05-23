'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from './useAuth';
import { accountDayKey } from '@/lib/sessions/dayKey';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KidProfileSummary {
  id: string;
  name: string;
  avatar?: string;
  mascotId?: string;
  avatarUrl?: string;
  age?: number;
  grade?: string;
  board?: string;
  aiPoints: number;
  badges: string[];
  totalCreations: number;
  creationsByType?: Record<string, number>;
  conceptsLearned?: string[];
  streak?: { current: number; longest: number; lastActiveDate: string };
}

interface KidProfileState {
  /** Currently active kid profile */
  activeKid: KidProfileSummary | null;
  /** All kid profiles for this parent */
  kids: KidProfileSummary[];
  /** Loading state */
  loading: boolean;
  /** True if parent has at least one kid profile */
  hasKids: boolean;
  /** True if authenticated but has no kid profiles (needs forced setup) */
  needsProfileSetup: boolean;
  /** True if authenticated and has kids but none selected yet (needs picker) */
  needsProfileSelection: boolean;
  /** Switch active kid */
  switchKid: (kidId: string) => void;
  /** Refresh kids list from server */
  refreshKids: () => Promise<void>;
  /**
   * Patch a kid in-place from a known PATCH response without going to the
   * server. Used after incremental PATCHes (mascot save, avatar save) so
   * we don't fire a redundant GET /api/users/kids for a change we already
   * know about. The provided fields are merged into both the kids list
   * AND the activeKid (if it matches the kidId).
   */
  updateKidLocal: (
    kidId: string,
    fields: Partial<KidProfileSummary>,
  ) => void;
  /** Clear active kid selection (returns to picker) */
  clearActiveKid: () => void;
}

const ACTIVE_KID_KEY = 'gsi-active-kid-id';

// ─── Context ────────────────────────────────────────────────────────────────

const KidProfileContext = createContext<KidProfileState>({
  activeKid: null,
  kids: [],
  loading: false,
  hasKids: false,
  needsProfileSetup: false,
  needsProfileSelection: false,
  switchKid: () => {},
  refreshKids: async () => {},
  updateKidLocal: () => {},
  clearActiveKid: () => {},
});

export function useKidProfile(): KidProfileState {
  return useContext(KidProfileContext);
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface KidProfileProviderProps {
  children: ReactNode;
}

export function KidProfileProvider({ children }: KidProfileProviderProps) {
  const { isAuthenticated, loading: authLoading, getIdToken, user } = useAuth();
  // Account-base timezone. Falls back to device-local for legacy users
  // without a stored tz; `accountDayKey` handles the fallback for us.
  const accountTimezone = user?.timezone;
  const [kids, setKids] = useState<KidProfileSummary[]>([]);
  const [activeKid, setActiveKid] = useState<KidProfileSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const initialAuthCheckRef = useRef(false);

  // On every authenticated mount (fresh sign-in OR page refresh), force the
  // profile picker by clearing any previously-saved active kid. This guarantees
  // we always know which kid is at the device right now, so kid-scoped gates
  // downstream (the missing-fields carousel on `/`, AI Points HUD, points/badge
  // writes) all operate on an explicitly-confirmed profile rather than
  // whoever happened to be active last.
  useEffect(() => {
    if (authLoading) return; // Firebase hasn't resolved yet — skip
    if (initialAuthCheckRef.current) return; // Only on first post-auth render
    initialAuthCheckRef.current = true;

    if (isAuthenticated) {
      localStorage.removeItem(ACTIVE_KID_KEY);
      setActiveKid(null);
    }
  }, [authLoading, isAuthenticated]);

  const fetchKids = useCallback(async () => {
    if (!isAuthenticated) {
      setKids([]);
      setActiveKid(null);
      return;
    }

    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch('/api/users/kids', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setKids(json.data);

          // Restore active kid from localStorage only (don't auto-select first)
          // The ProfilePicker gate handles selection if none is saved
          const savedKidId = localStorage.getItem(ACTIVE_KID_KEY);
          if (savedKidId) {
            const savedKid = json.data.find(
              (k: KidProfileSummary) => k.id === savedKidId
            );
            setActiveKid(savedKid || null);
          }
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getIdToken]);

  // Fetch kids when auth state changes
  useEffect(() => {
    fetchKids();
  }, [fetchKids]);

  const switchKid = useCallback(
    (kidId: string) => {
      const kid = kids.find((k) => k.id === kidId);
      if (!kid) return;
      setActiveKid(kid);
      localStorage.setItem(ACTIVE_KID_KEY, kidId);

      // Rotate gsi-session-id to a kid-scoped daily session. The server
      // create-or-resume call is idempotent: same (kidId, dayKey) always
      // resolves to the same session doc, so two clients picking the same
      // kid on the same day land on the same id without coordinating.
      //
      // Fire-and-forget — the localStorage swap happens synchronously so
      // immediate writes (points, creations) use the kid-scoped id. The
      // server-side doc creation completes shortly after. If the network
      // call fails, the in-memory + localStorage state is still consistent
      // and a later interaction (or day-rollover effect) will retry.
      (async () => {
        try {
          const dayKey = accountDayKey(accountTimezone);
          const token = await getIdToken();
          if (!token) return;
          const res = await fetch('/api/sessions/kid', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ kidId, dayKey }),
          });
          if (res.ok) {
            const json = await res.json();
            const newSessionId = json?.data?.sessionId;
            if (typeof newSessionId === 'string' && newSessionId.length > 0) {
              localStorage.setItem('gsi-session-id', newSessionId);
            }
          }
        } catch {
          // Network blip — non-blocking. A later interaction will retry.
        }
      })();
    },
    [kids, getIdToken, accountTimezone],
  );

  const clearActiveKid = useCallback(() => {
    setActiveKid(null);
    localStorage.removeItem(ACTIVE_KID_KEY);
  }, []);

  /**
   * Merge known field changes into local kid state without hitting the
   * server. Used after a PATCH response we already have in hand — avoids
   * a redundant GET that would just re-fetch what we already know.
   */
  const updateKidLocal = useCallback(
    (kidId: string, fields: Partial<KidProfileSummary>) => {
      setKids((prev) =>
        prev.map((k) => (k.id === kidId ? { ...k, ...fields } : k)),
      );
      setActiveKid((prev) =>
        prev && prev.id === kidId ? { ...prev, ...fields } : prev,
      );
    },
    [],
  );

  // Day-rollover detection: when the active kid's session id encodes a
  // day that's no longer "today" (kid kept the app open across midnight,
  // or returned the next morning without re-picking), rotate to a fresh
  // session under the same kid. Calling switchKid is idempotent — it just
  // re-runs the create-or-resume POST against today's dayKey.
  //
  // Triggers: mount (catches "opened next morning"), visibility change
  // (catches "tab returned after midnight"), and window focus. Cheap reads
  // of localStorage, no network calls until a mismatch is detected.
  useEffect(() => {
    if (!activeKid) return;

    const checkRollover = () => {
      try {
        const currentSessionId = localStorage.getItem('gsi-session-id');
        if (!currentSessionId) return;
        // Only kid-scoped session ids contain the dayKey suffix.
        const expectedPrefix = `kid-${activeKid.id}-`;
        if (!currentSessionId.startsWith(expectedPrefix)) return;
        // Bucket by the *account's* base timezone, not the device's, so a
        // parent traveling abroad doesn't see their kid's streak split or
        // merged at the wrong moment.
        const todaySuffix = accountDayKey(accountTimezone);
        if (currentSessionId === `${expectedPrefix}${todaySuffix}`) return;
        // Day rolled over — re-establish today's kid session.
        switchKid(activeKid.id);
      } catch {
        // localStorage unavailable — non-blocking
      }
    };

    checkRollover();
    document.addEventListener('visibilitychange', checkRollover);
    window.addEventListener('focus', checkRollover);
    return () => {
      document.removeEventListener('visibilitychange', checkRollover);
      window.removeEventListener('focus', checkRollover);
    };
  }, [activeKid, switchKid, accountTimezone]);

  const hasKids = kids.length > 0;
  const needsProfileSetup = isAuthenticated && !loading && kids.length === 0;
  const needsProfileSelection = isAuthenticated && !loading && kids.length > 0 && !activeKid;

  const value: KidProfileState = {
    activeKid,
    kids,
    loading,
    hasKids,
    needsProfileSetup,
    needsProfileSelection,
    switchKid,
    refreshKids: fetchKids,
    updateKidLocal,
    clearActiveKid,
  };

  const { createElement } = require('react');
  return createElement(KidProfileContext.Provider, { value }, children);
}
