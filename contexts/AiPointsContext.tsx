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

const SESSION_KEY = 'gsi-session-id';
const POINTS_KEY = 'gsi-ai-points'; // kept for optimistic initial load & migration

function getSessionId(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem(SESSION_KEY) ?? '') : '';
}

// ─── Context types ────────────────────────────────────────────────────────────

interface AiPointsState {
  totalPoints: number;
  conceptsLearned: string[];
  badges: string[];
  creationsByType: Record<string, number>;
  pendingPoints: number;
  newBadges: string[]; // non-empty triggers CelebrationModal
  isLoaded: boolean;   // false until first Firestore response
  addPoints: (amount: number, concept?: string) => Promise<void>;
  trackCreation: (creationType: string) => Promise<void>;
  trackShare: () => Promise<void>;
  dismissBadgeCelebration: () => void;
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
  const [isLoaded, setIsLoaded] = useState(false);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply a full PointsResponse snapshot to state
  const applySnapshot = useCallback((data: PointsResponse) => {
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
  }, []);

  // Load from Firestore on mount; use localStorage as optimistic initial value
  useEffect(() => {
    // Instant display from localStorage while server responds
    if (typeof window !== 'undefined') {
      const stored = parseInt(localStorage.getItem(POINTS_KEY) ?? '0', 10);
      if (stored > 0) setTotalPoints(stored);
    }

    const sessionId = getSessionId();
    if (!sessionId) {
      setIsLoaded(true);
      return;
    }

    fetch('/api/sessions/points', {
      headers: { 'X-Session-Id': sessionId },
    })
      .then((res) => res.json())
      .then((json: ApiResponse<PointsResponse>) => {
        if (json.success && json.data) {
          applySnapshot({ ...json.data, newBadges: [] });
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
      const sessionId = getSessionId();
      if (!sessionId) return null;

      try {
        const res = await fetch('/api/sessions/points', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Id': sessionId,
          },
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

  const dismissBadgeCelebration = useCallback(() => {
    setNewBadges([]);
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
        pendingPoints,
        newBadges,
        isLoaded,
        addPoints,
        trackCreation,
        trackShare,
        dismissBadgeCelebration,
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
