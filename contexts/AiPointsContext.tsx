'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { BADGE_CATALOG, type Badge, type UserStats } from '@/lib/badges';
import type { CreationType } from '@/types/creation.types';

const POINTS_KEY = 'gsi-ai-points';
const CONCEPTS_KEY = 'gsi-concepts-learned';
const SESSION_KEY = 'gsi-session-id';

interface BadgeUnlockEvent {
  badge: Badge;
}

interface AiPointsState {
  totalPoints: number;
  conceptsLearned: string[];
  pendingPoints: number;
  badges: string[];
  stats: UserStats;
  badgeGalleryOpen: boolean;
  recentBadgeUnlock: BadgeUnlockEvent | null;
  addPoints: (amount: number, concept?: string) => void;
  trackCreation: (type: CreationType) => void;
  trackShare: () => void;
  openBadgeGallery: () => void;
  closeBadgeGallery: () => void;
  dismissBadgeUnlock: () => void;
  syncFromServer: () => Promise<void>;
}

const DEFAULT_STATS: UserStats = {
  aiPoints: 0,
  conceptsLearned: [],
  creationsByType: { story: 0, music: 0, quiz: 0, game: 0, comic: 0 },
  shareCount: 0,
  totalCreations: 0,
  badges: [],
};

const AiPointsContext = createContext<AiPointsState | null>(null);

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

async function callPointsApi(
  action: string,
  payload: Record<string, unknown> = {}
) {
  const sessionId = getSessionId();
  if (!sessionId) return null;

  try {
    const res = await fetch('/api/sessions/points', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify({ action, payload }),
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch {
    // Server unavailable — fallback to localStorage
  }
  return null;
}

async function fetchPointsFromServer() {
  const sessionId = getSessionId();
  if (!sessionId) return null;

  try {
    const res = await fetch('/api/sessions/points', {
      headers: { 'X-Session-Id': sessionId },
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch {
    // Server unavailable
  }
  return null;
}

export function AiPointsProvider({ children }: { children: ReactNode }) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [conceptsLearned, setConceptsLearned] = useState<string[]>([]);
  const [pendingPoints, setPendingPoints] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [badgeGalleryOpen, setBadgeGalleryOpen] = useState(false);
  const [recentBadgeUnlock, setRecentBadgeUnlock] = useState<BadgeUnlockEvent | null>(null);

  // Update stats when constituent parts change
  const updateStats = useCallback(
    (overrides?: Partial<UserStats>) => {
      setStats((prev) => ({
        ...prev,
        aiPoints: overrides?.aiPoints ?? totalPoints,
        conceptsLearned: overrides?.conceptsLearned ?? conceptsLearned,
        badges: overrides?.badges ?? badges,
        ...overrides,
      }));
    },
    [totalPoints, conceptsLearned, badges]
  );

  const handleNewBadges = useCallback((newBadgeIds: string[]) => {
    if (newBadgeIds.length === 0) return;
    const firstNew = BADGE_CATALOG.find((b) => b.id === newBadgeIds[0]);
    if (firstNew) {
      setRecentBadgeUnlock({ badge: firstNew });
    }
  }, []);

  // SSR-safe: load from localStorage on mount, then sync with server
  useEffect(() => {
    // Load localStorage as initial values (fast)
    const stored = localStorage.getItem(POINTS_KEY);
    if (stored) setTotalPoints(parseInt(stored, 10) || 0);

    const concepts = localStorage.getItem(CONCEPTS_KEY);
    if (concepts) {
      try {
        setConceptsLearned(JSON.parse(concepts));
      } catch {
        // corrupted data — reset
      }
    }

    // Sync with server (overwrites localStorage values if server has data)
    fetchPointsFromServer().then((data) => {
      if (!data) return;
      setTotalPoints(data.aiPoints);
      setConceptsLearned(data.conceptsLearned);
      setBadges(data.badges);
      const totalCreations = Object.values(
        data.creationsByType as Record<string, number>
      ).reduce((sum: number, n: number) => sum + n, 0);
      setStats({
        aiPoints: data.aiPoints,
        conceptsLearned: data.conceptsLearned,
        creationsByType: data.creationsByType,
        shareCount: data.shareCount,
        totalCreations,
        badges: data.badges,
      });
      // Update localStorage to match server
      localStorage.setItem(POINTS_KEY, String(data.aiPoints));
      localStorage.setItem(CONCEPTS_KEY, JSON.stringify(data.conceptsLearned));
    });
  }, []);

  const syncFromServer = useCallback(async () => {
    const data = await fetchPointsFromServer();
    if (!data) return;
    setTotalPoints(data.aiPoints);
    setConceptsLearned(data.conceptsLearned);
    setBadges(data.badges);
    const totalCreations = Object.values(
      data.creationsByType as Record<string, number>
    ).reduce((sum: number, n: number) => sum + n, 0);
    setStats({
      aiPoints: data.aiPoints,
      conceptsLearned: data.conceptsLearned,
      creationsByType: data.creationsByType,
      shareCount: data.shareCount,
      totalCreations,
      badges: data.badges,
    });
    localStorage.setItem(POINTS_KEY, String(data.aiPoints));
    localStorage.setItem(CONCEPTS_KEY, JSON.stringify(data.conceptsLearned));
  }, []);

  const addPoints = useCallback(
    (amount: number, concept?: string) => {
      // Optimistic local update
      setTotalPoints((prev) => {
        const next = prev + amount;
        localStorage.setItem(POINTS_KEY, String(next));
        return next;
      });

      setPendingPoints(amount);
      setTimeout(() => setPendingPoints(0), 2000);

      if (concept) {
        setConceptsLearned((prev) => {
          if (prev.includes(concept)) return prev;
          const next = [...prev, concept];
          localStorage.setItem(CONCEPTS_KEY, JSON.stringify(next));
          return next;
        });
      }

      // Persist to server + check badges
      callPointsApi('add_points', { amount }).then((data) => {
        if (!data) return;
        handleNewBadges(data.newBadges);
        if (data.newBadges.length > 0) {
          setBadges(data.badges);
          updateStats({ badges: data.badges });
        }
      });

      if (concept) {
        callPointsApi('learn_concept', { concept }).then((data) => {
          if (!data) return;
          handleNewBadges(data.newBadges);
          if (data.newBadges.length > 0) {
            setBadges(data.badges);
            updateStats({ badges: data.badges });
          }
        });
      }
    },
    [handleNewBadges, updateStats]
  );

  const trackCreation = useCallback(
    (type: CreationType) => {
      callPointsApi('track_creation', { creationType: type }).then((data) => {
        if (!data) return;
        handleNewBadges(data.newBadges);
        const totalCreations = Object.values(
          data.creationsByType as Record<string, number>
        ).reduce((sum: number, n: number) => sum + n, 0);
        setBadges(data.badges);
        setStats({
          aiPoints: data.aiPoints,
          conceptsLearned: data.conceptsLearned,
          creationsByType: data.creationsByType,
          shareCount: data.shareCount,
          totalCreations,
          badges: data.badges,
        });
      });
    },
    [handleNewBadges]
  );

  const trackShare = useCallback(() => {
    callPointsApi('track_share').then((data) => {
      if (!data) return;
      handleNewBadges(data.newBadges);
      const totalCreations = Object.values(
        data.creationsByType as Record<string, number>
      ).reduce((sum: number, n: number) => sum + n, 0);
      setBadges(data.badges);
      setStats({
        aiPoints: data.aiPoints,
        conceptsLearned: data.conceptsLearned,
        creationsByType: data.creationsByType,
        shareCount: data.shareCount,
        totalCreations,
        badges: data.badges,
      });
    });
  }, [handleNewBadges]);

  const openBadgeGallery = useCallback(() => setBadgeGalleryOpen(true), []);
  const closeBadgeGallery = useCallback(() => setBadgeGalleryOpen(false), []);
  const dismissBadgeUnlock = useCallback(() => setRecentBadgeUnlock(null), []);

  return (
    <AiPointsContext.Provider
      value={{
        totalPoints,
        conceptsLearned,
        pendingPoints,
        badges,
        stats,
        badgeGalleryOpen,
        recentBadgeUnlock,
        addPoints,
        trackCreation,
        trackShare,
        openBadgeGallery,
        closeBadgeGallery,
        dismissBadgeUnlock,
        syncFromServer,
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
