'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from './useAuth';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KidProfileSummary {
  id: string;
  name: string;
  avatar?: string;
  age?: number;
  grade?: string;
  board?: string;
  aiPoints: number;
  badges: string[];
  totalCreations: number;
  streak?: { current: number; longest: number; lastActiveDate: string };
}

interface KidProfileState {
  /** Currently active kid profile */
  activeKid: KidProfileSummary | null;
  /** All kid profiles for this parent */
  kids: KidProfileSummary[];
  /** Loading state */
  loading: boolean;
  /** Switch active kid */
  switchKid: (kidId: string) => void;
  /** Refresh kids list from server */
  refreshKids: () => Promise<void>;
}

const ACTIVE_KID_KEY = 'gsi-active-kid-id';

// ─── Context ────────────────────────────────────────────────────────────────

const KidProfileContext = createContext<KidProfileState>({
  activeKid: null,
  kids: [],
  loading: false,
  switchKid: () => {},
  refreshKids: async () => {},
});

export function useKidProfile(): KidProfileState {
  return useContext(KidProfileContext);
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface KidProfileProviderProps {
  children: ReactNode;
}

export function KidProfileProvider({ children }: KidProfileProviderProps) {
  const { isAuthenticated, getIdToken } = useAuth();
  const [kids, setKids] = useState<KidProfileSummary[]>([]);
  const [activeKid, setActiveKid] = useState<KidProfileSummary | null>(null);
  const [loading, setLoading] = useState(false);

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

          // Restore active kid from localStorage, or default to first
          const savedKidId = localStorage.getItem(ACTIVE_KID_KEY);
          const savedKid = json.data.find(
            (k: KidProfileSummary) => k.id === savedKidId
          );
          setActiveKid(savedKid || json.data[0] || null);
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
      if (kid) {
        setActiveKid(kid);
        localStorage.setItem(ACTIVE_KID_KEY, kidId);
      }
    },
    [kids]
  );

  const value: KidProfileState = {
    activeKid,
    kids,
    loading,
    switchKid,
    refreshKids: fetchKids,
  };

  const { createElement } = require('react');
  return createElement(KidProfileContext.Provider, { value }, children);
}
