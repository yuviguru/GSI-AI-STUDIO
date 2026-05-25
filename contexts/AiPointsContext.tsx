'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { ApiResponse, PointsResponse } from '@gsi/types';
import type { ConfettiVariant } from '@/components/celebrations/ConfettiCelebration';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useAuth } from '@/hooks/useAuth';

const SESSION_KEY = 'gsi-session-id';
const POINTS_KEY = 'gsi-ai-points'; // kept for optimistic initial load & migration
const MILESTONES_KEY = 'gsi-milestones-shown';

// ─── Milestone types & thresholds ───────────────────────────────────────────

export interface MilestoneCelebration {
  type: 'milestone';
  message: string;
  variant: ConfettiVariant;
}

interface MilestoneThreshold {
  id: string;
  check: (points: number, totalCreations: number) => boolean;
  message: string;
  variant: ConfettiVariant;
}

const MILESTONE_THRESHOLDS: MilestoneThreshold[] = [
  { id: 'first_creation', check: (_, tc) => tc >= 1, message: 'Your first AI creation!', variant: 'burst' },
  { id: 'points_50', check: (p) => p >= 50, message: '50 AI Points!', variant: 'burst' },
  { id: 'points_100', check: (p) => p >= 100, message: '100 AI Points!', variant: 'rain' },
  { id: 'creations_5', check: (_, tc) => tc >= 5, message: '5 Creations!', variant: 'rain' },
  { id: 'creations_10', check: (_, tc) => tc >= 10, message: '10 Creations!', variant: 'sides' },
];

function getShownMilestones(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(MILESTONES_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function markMilestoneShown(id: string) {
  if (typeof window === 'undefined') return;
  const shown = getShownMilestones();
  shown.add(id);
  localStorage.setItem(MILESTONES_KEY, JSON.stringify([...shown]));
}

// ─── Context types ────────────────────────────────────────────────────────────

/** Per-studio daily streak entry — mirrors the server-side shape so it can
 *  flow straight from the points API to UI without re-shaping. */
export interface StudioStreak {
  count: number;
  lastDay: string;
}

interface AiPointsState {
  totalPoints: number;
  conceptsLearned: string[];
  badges: string[];
  creationsByType: Record<string, number>;
  perStudioStreaks: Record<string, StudioStreak>;
  pendingPoints: number;
  newBadges: string[]; // non-empty triggers CelebrationModal badge mode
  celebration: MilestoneCelebration | null; // non-null triggers CelebrationModal milestone mode
  isLoaded: boolean;   // false until first Firestore response
  addPoints: (amount: number, concept?: string) => Promise<void>;
  trackCreation: (creationType: string) => Promise<void>;
  trackShare: () => Promise<void>;
  reloadFromServer: () => Promise<void>;
  dismissBadgeCelebration: () => void;
  dismissCelebration: () => void;
}

/** Today's ISO YYYY-MM-DD aligned to Asia/Kolkata — the same day-boundary
 *  convention used by the homework streak path. Keeps "wrote today" honest
 *  for kids across timezones without leaking server-clock skew. */
function todayKolkataISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  // en-CA formats as YYYY-MM-DD directly
  return parts;
}

const AiPointsContext = createContext<AiPointsState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AiPointsProvider({ children }: { children: ReactNode }) {
  const { activeKid } = useKidProfile();
  const { getIdToken, isAuthenticated, loading: authLoading } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);
  const [conceptsLearned, setConceptsLearned] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [creationsByType, setCreationsByType] = useState<Record<string, number>>({});
  const [perStudioStreaks, setPerStudioStreaks] = useState<Record<string, StudioStreak>>({});
  const [pendingPoints, setPendingPoints] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [celebration, setCelebration] = useState<MilestoneCelebration | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether kid hydration has occurred — prevents the mount effect's
  // stale session fetch from overwriting the correct kid data.
  const kidHydratedRef = useRef(false);

  // Check for new milestones after any state update from server
  const checkMilestones = useCallback((points: number, cbt: Record<string, number>) => {
    const shown = getShownMilestones();
    const totalCreations = Object.values(cbt).reduce((s, n) => s + n, 0);

    for (const m of MILESTONE_THRESHOLDS) {
      if (!shown.has(m.id) && m.check(points, totalCreations)) {
        markMilestoneShown(m.id);
        setCelebration({ type: 'milestone', message: m.message, variant: m.variant });
        break; // Show one at a time
      }
    }
  }, []);

  // Apply a full PointsResponse snapshot to state
  const applySnapshot = useCallback((data: PointsResponse, skipMilestones = false) => {
    setTotalPoints(data.aiPoints);
    setConceptsLearned(data.conceptsLearned);
    setBadges(data.badges);
    setCreationsByType(data.creationsByType);
    setPerStudioStreaks(data.perStudioStreaks ?? {});
    if (data.newBadges?.length > 0) {
      setNewBadges((prev) => [...prev, ...data.newBadges]);
    }
    // Keep localStorage in sync as optimistic cache
    if (typeof window !== 'undefined') {
      localStorage.setItem(POINTS_KEY, String(data.aiPoints));
    }
    // Check milestones after mutation responses (not on initial load)
    if (!skipMilestones) {
      checkMilestones(data.aiPoints, data.creationsByType);
    }
  }, [checkMilestones]);

  // Load from Firestore on mount; use localStorage as optimistic initial value.
  //
  // For authenticated users we DEFER the session fetch until either (a) the
  // active kid resolves (kid hydration takes precedence), or (b) it's clear
  // no kid is coming. This prevents the brief flash where session points
  // appear, then get overwritten by kid points one tick later.
  useEffect(() => {
    // Instant display from localStorage while server responds
    if (typeof window !== 'undefined') {
      const stored = parseInt(localStorage.getItem(POINTS_KEY) ?? '0', 10);
      if (stored > 0) setTotalPoints(stored);
    }

    if (typeof window === 'undefined' || !localStorage.getItem(SESSION_KEY)) {
      setIsLoaded(true);
      return;
    }

    // Wait for auth resolution before deciding. Authed users get kid data;
    // anonymous users get session data. Prevents the race outright.
    if (authLoading) return;

    // Authenticated path: skip session fetch entirely — the kid hydration
    // effect (below) is the source of truth. If the kid never resolves
    // (e.g. parent not yet finished onboarding), state stays at the optimistic
    // localStorage value, which is acceptable.
    if (isAuthenticated) {
      setIsLoaded(true);
      return;
    }

    // Anonymous path: hydrate from session.
    fetchWithSession('/api/sessions/points')
      .then((res) => res.json())
      .then((json: ApiResponse<PointsResponse>) => {
        if (kidHydratedRef.current) return; // belt-and-braces guard
        if (json.success && json.data) {
          applySnapshot({ ...json.data, newBadges: [] }, true);
        }
      })
      .catch(() => {
        // Server unavailable — keep localStorage values, non-blocking
      })
      .finally(() => setIsLoaded(true));
  }, [applySnapshot, authLoading, isAuthenticated]);

  // When an active kid is selected (post sign-in / profile pick), hydrate
  // dashboard state from the kid's profile so XP, badges, completed counts
  // and concepts reflect the kid — not the (possibly freshly-minted)
  // anonymous session.
  useEffect(() => {
    if (!activeKid) {
      kidHydratedRef.current = false;
      return;
    }
    kidHydratedRef.current = true;
    setTotalPoints(activeKid.aiPoints ?? 0);
    setBadges(activeKid.badges ?? []);
    setCreationsByType(activeKid.creationsByType ?? {});
    setConceptsLearned(activeKid.conceptsLearned ?? []);
    setPerStudioStreaks(activeKid.perStudioStreaks ?? {});
    if (typeof window !== 'undefined') {
      localStorage.setItem(POINTS_KEY, String(activeKid.aiPoints ?? 0));
    }
    setIsLoaded(true);
  }, [activeKid]);

  // Helper: call PATCH and apply returned snapshot
  const activeKidId = activeKid?.id;
  const patchPoints = useCallback(
    async (body: Record<string, unknown>): Promise<PointsResponse | null> => {
      if (typeof window === 'undefined' || !localStorage.getItem(SESSION_KEY)) return null;

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (activeKidId) {
          // When a kid is active, the server verifies parent ownership of the
          // kid doc before writing. That requires a Firebase ID token.
          headers['X-Active-Kid-Id'] = activeKidId;
          const token = await getIdToken();
          if (token) headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetchWithSession('/api/sessions/points', {
          method: 'PATCH',
          headers,
          body: JSON.stringify(activeKidId ? { ...body, kidId: activeKidId } : body),
        });
        const json: ApiResponse<PointsResponse> = await res.json();
        if (json.success && json.data) {
          applySnapshot(json.data);
          return json.data;
        }
      } catch {
        // Network failure — optimistic state already applied, non-blocking
      }
      return null;
    },
    [applySnapshot, activeKidId, getIdToken]
  );

  const addPoints = useCallback(
    async (amount: number, concept?: string) => {
      // Optimistic update
      setTotalPoints((prev) => {
        const next = prev + amount;
        if (typeof window !== 'undefined') localStorage.setItem(POINTS_KEY, String(next));
        return next;
      });
      if (concept) {
        setConceptsLearned((prev) => (prev.includes(concept) ? prev : [...prev, concept]));
      }
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      setPendingPoints(amount);
      pendingTimer.current = setTimeout(() => setPendingPoints(0), 2000);

      // Persist to Firestore (concept included in add_points to reduce round trips)
      await patchPoints({ action: 'add_points', points: amount, concept });
    },
    [patchPoints]
  );

  const trackCreation = useCallback(
    async (creationType: string) => {
      // Optimistic update
      setCreationsByType((prev) => ({
        ...prev,
        [creationType]: (prev[creationType] ?? 0) + 1,
      }));
      // Send today's date (kid local day, Asia/Kolkata) so the server can
      // bump the per-studio streak when this creationType is a studio.
      await patchPoints({
        action: 'track_creation',
        creationType,
        todayDate: todayKolkataISO(),
      });
    },
    [patchPoints]
  );

  const trackShare = useCallback(async () => {
    await patchPoints({ action: 'track_share' });
  }, [patchPoints]);

  // Re-fetch state from Firestore (used when points are updated server-side, e.g. Beat the AI)
  const reloadFromServer = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem(SESSION_KEY)) return;
    try {
      const res = await fetchWithSession('/api/sessions/points');
      const json: ApiResponse<PointsResponse> = await res.json();
      if (json.success && json.data) {
        applySnapshot(json.data);
      }
    } catch {
      // non-blocking
    }
  }, [applySnapshot]);

  const dismissBadgeCelebration = useCallback(() => {
    // Dequeue only the first badge so subsequent unlocks are still shown one at a time
    setNewBadges((prev) => prev.slice(1));
  }, []);

  const dismissCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  // Cleanup pending timer
  useEffect(() => {
    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, []);

  return (
    <AiPointsContext.Provider
      value={{
        totalPoints,
        conceptsLearned,
        badges,
        creationsByType,
        perStudioStreaks,
        pendingPoints,
        newBadges,
        celebration,
        isLoaded,
        addPoints,
        trackCreation,
        trackShare,
        reloadFromServer,
        dismissBadgeCelebration,
        dismissCelebration,
      }}
    >
      {children}
    </AiPointsContext.Provider>
  );
}

export function useAiPoints(): AiPointsState {
  const ctx = useContext(AiPointsContext);
  if (!ctx) {
    throw new Error('useAiPoints must be used within <AiPointsProvider>');
  }
  return ctx;
}
