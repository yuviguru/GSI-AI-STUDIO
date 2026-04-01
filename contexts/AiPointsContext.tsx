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
import type { ApiResponse, PointsResponse } from '@/types';
import type { ConfettiVariant } from '@/components/celebrations/ConfettiCelebration';
import { fetchWithSession } from '@/lib/fetchWithSession';

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

interface AiPointsState {
  totalPoints: number;
  conceptsLearned: string[];
  badges: string[];
  creationsByType: Record<string, number>;
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

const AiPointsContext = createContext<AiPointsState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AiPointsProvider({ children }: { children: ReactNode }) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [conceptsLearned, setConceptsLearned] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [creationsByType, setCreationsByType] = useState<Record<string, number>>({});
  const [pendingPoints, setPendingPoints] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [celebration, setCelebration] = useState<MilestoneCelebration | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load from Firestore on mount; use localStorage as optimistic initial value
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

    fetchWithSession('/api/sessions/points')
      .then((res) => res.json())
      .then((json: ApiResponse<PointsResponse>) => {
        if (json.success && json.data) {
          applySnapshot({ ...json.data, newBadges: [] }, true);
        }
      })
      .catch(() => {
        // Server unavailable — keep localStorage values, non-blocking
      })
      .finally(() => setIsLoaded(true));
  }, [applySnapshot]);

  // Helper: call PATCH and apply returned snapshot
  const patchPoints = useCallback(
    async (body: Record<string, unknown>): Promise<PointsResponse | null> => {
      if (typeof window === 'undefined' || !localStorage.getItem(SESSION_KEY)) return null;

      try {
        const res = await fetchWithSession('/api/sessions/points', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
    [applySnapshot]
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
      await patchPoints({ action: 'track_creation', creationType });
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

  // Reload points when kid profile is switched
  useEffect(() => {
    function handleKidSwitch() {
      // fetchWithSession will auto-send the new X-Kid-Id header
      reloadFromServer();
    }
    window.addEventListener('gsi-kid-switched', handleKidSwitch);
    return () => window.removeEventListener('gsi-kid-switched', handleKidSwitch);
  }, [reloadFromServer]);

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
