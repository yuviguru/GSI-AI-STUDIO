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
  const { isAuthenticated, getIdToken } = useAuth();
  const [kids, setKids] = useState<KidProfileSummary[]>([]);
  const [activeKid, setActiveKid] = useState<KidProfileSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const prevAuthRef = useRef<boolean | null>(null);

  // On fresh sign-in (auth transitions false → true), force the profile picker
  // by clearing any previously-saved active kid.
  useEffect(() => {
    const prev = prevAuthRef.current;
    if (prev === false && isAuthenticated === true) {
      localStorage.removeItem(ACTIVE_KID_KEY);
      setActiveKid(null);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

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
      if (kid) {
        setActiveKid(kid);
        localStorage.setItem(ACTIVE_KID_KEY, kidId);
      }
    },
    [kids]
  );

  const clearActiveKid = useCallback(() => {
    setActiveKid(null);
    localStorage.removeItem(ACTIVE_KID_KEY);
  }, []);

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
    clearActiveKid,
  };

  const { createElement } = require('react');
  return createElement(KidProfileContext.Provider, { value }, children);
}
