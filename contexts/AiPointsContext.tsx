'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

const POINTS_KEY = 'gsi-ai-points';
const CONCEPTS_KEY = 'gsi-concepts-learned';

interface AiPointsState {
  totalPoints: number;
  conceptsLearned: string[];
  pendingPoints: number;
  addPoints: (amount: number, concept?: string) => void;
}

const AiPointsContext = createContext<AiPointsState | null>(null);

export function AiPointsProvider({ children }: { children: ReactNode }) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [conceptsLearned, setConceptsLearned] = useState<string[]>([]);
  const [pendingPoints, setPendingPoints] = useState(0);

  // SSR-safe: load from localStorage after mount
  useEffect(() => {
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
  }, []);

  const addPoints = useCallback((amount: number, concept?: string) => {
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
  }, []);

  return (
    <AiPointsContext.Provider
      value={{ totalPoints, conceptsLearned, pendingPoints, addPoints }}
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
