'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  CeoBusiness,
  CeoBusinessType,
  CeoChoiceId,
  CeoDimensionScores,
  CeoEvent,
  CeoPace,
} from '@/types';
import { fetchWithKidAuth, KidAuthMissingError } from '@/lib/fetchWithKidAuth';
import { useAuth } from './useAuth';
import { useKidProfile } from './useKidProfile';

export interface CeoDecisionHistoryEntry {
  event: CeoEvent;
  decision: {
    choiceId: CeoChoiceId;
    choiceText: string;
    scores: CeoDimensionScores;
    feedback: string;
    timestamp: string;
  };
}

export interface RegisterBusinessParams {
  businessType: CeoBusinessType;
  businessName?: string;
  customBusinessDescription?: string;
  location: string;
  pace: CeoPace;
}

export interface RegisterBusinessResponse {
  businessId: string;
  business: CeoBusiness;
  firstEvent: CeoEvent;
}

export interface DecideParams {
  eventId: string;
  choiceId: CeoChoiceId;
  responseTimeSeconds: number;
}

export interface DecideResponse {
  scores: CeoDimensionScores;
  feedback: string;
  updatedBusiness: CeoBusiness;
  nextEvent: CeoEvent | null;
  phaseAdvanced: boolean;
  milestoneResolved: string | null;
  aiPointsEarned: number;
  newBadges: string[];
}

export interface FetchNextEventResponse {
  event: CeoEvent | null;
  pendingDecisionExists: boolean;
  regularEventsToday?: number;
  regularEventsCap?: number;
  regularCapHit?: boolean;
}

interface BusinessGetResponse {
  business: CeoBusiness;
  pendingMilestone: CeoEvent | null;
  pendingRegular: CeoEvent | null;
  /** @deprecated milestone ?? regular — kept for legacy compat. */
  pendingEvent: CeoEvent | null;
  decisionHistory: CeoDecisionHistoryEntry[];
}

export interface UseCeoBusinessReturn {
  business: CeoBusiness | null;
  pendingMilestone: CeoEvent | null;
  pendingRegular: CeoEvent | null;
  /** @deprecated milestone ?? regular — kept for legacy callers. */
  pendingEvent: CeoEvent | null;
  decisionHistory: CeoDecisionHistoryEntry[];
  /** True only when signed in AND a kid is selected. */
  ready: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  registerBusiness: (params: RegisterBusinessParams) => Promise<RegisterBusinessResponse>;
  decide: (params: DecideParams) => Promise<DecideResponse>;
  /** Phase 3 — pull a new regular event (kid-initiated "Take a small
   *  decision" button). Returns the freshly-minted event, or null with
   *  `regularCapHit: true` when the 5/day cap is reached. */
  pullRegularEvent: (businessId: string) => Promise<FetchNextEventResponse>;
  /** @deprecated alias for pullRegularEvent; kept until external callers
   *  migrate. */
  fetchNextEvent: (businessId: string) => Promise<FetchNextEventResponse>;
}

export interface UseCeoBusinessOptions {
  businessId?: string;
  autoFetch?: boolean;
}

export function useCeoBusiness(options?: UseCeoBusinessOptions): UseCeoBusinessReturn {
  const { businessId, autoFetch = true } = options ?? {};
  const { isAuthenticated, loading: authLoading, getIdToken } = useAuth();
  const { activeKid, loading: kidLoading } = useKidProfile();

  const ready = isAuthenticated && !!activeKid;
  const kidId = activeKid?.id ?? null;

  const [business, setBusiness] = useState<CeoBusiness | null>(null);
  const [pendingMilestone, setPendingMilestone] = useState<CeoEvent | null>(null);
  const [pendingRegular, setPendingRegular] = useState<CeoEvent | null>(null);
  const [decisionHistory, setDecisionHistory] = useState<CeoDecisionHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const apiFetch = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await fetchWithKidAuth(url, { getIdToken, kidId }, init);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Something went wrong');
      }
      return json.data as T;
    },
    [getIdToken, kidId],
  );

  const refetch = useCallback(async () => {
    if (!ready) {
      setBusiness(null);
      setPendingMilestone(null);
      setPendingRegular(null);
      setDecisionHistory([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = businessId
        ? `/api/ceo/business?businessId=${encodeURIComponent(businessId)}`
        : '/api/ceo/business';
      const data = await apiFetch<BusinessGetResponse>(url, { method: 'GET' });
      setBusiness(data.business);
      setPendingMilestone(data.pendingMilestone ?? null);
      setPendingRegular(data.pendingRegular ?? null);
      setDecisionHistory(data.decisionHistory);
    } catch (err) {
      if (err instanceof KidAuthMissingError) return;
      const message = err instanceof Error ? err.message : 'Failed to load business';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [ready, businessId, apiFetch]);

  useEffect(() => {
    if (!autoFetch) return;
    if (authLoading || kidLoading) return;
    void refetch();
  }, [autoFetch, refetch, authLoading, kidLoading]);

  const registerBusiness = useCallback(
    async (params: RegisterBusinessParams): Promise<RegisterBusinessResponse> => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<RegisterBusinessResponse>('/api/ceo/register', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        setBusiness(data.business);
        // First event on register is always a milestone (register route pins
        // it via `firstMilestone`).
        setPendingMilestone(data.firstEvent);
        setPendingRegular(null);
        setDecisionHistory([]);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to register business';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch],
  );

  const decide = useCallback(
    async (params: DecideParams): Promise<DecideResponse> => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<DecideResponse>('/api/ceo/decide', {
          method: 'POST',
          body: JSON.stringify(params),
        });

        setBusiness(data.updatedBusiness);

        // Phase 3 Daily Rhythm: clear the slot matching the decided event,
        // and populate the regular slot if the server auto-chained
        // (milestone decisions never set nextEvent per D4).
        setPendingMilestone((prev) =>
          prev && prev.id === params.eventId ? null : prev,
        );
        setPendingRegular((prev) => {
          if (prev && prev.id === params.eventId) {
            // Regular decision — either chain to the next regular or clear.
            return data.nextEvent;
          }
          return prev;
        });

        setDecisionHistory((prev) => {
          // The decide response doesn't echo the full event. Promote the
          // current pendingEvent (the one the kid just decided) into history.
          const decidedEvent = prev.find((h) => h.event.id === params.eventId)?.event;
          if (!decidedEvent) return prev;
          const choice = decidedEvent.choices.find((c) => c.id === params.choiceId);
          const entry: CeoDecisionHistoryEntry = {
            event: decidedEvent,
            decision: {
              choiceId: params.choiceId,
              choiceText: choice?.text ?? '',
              scores: data.scores,
              feedback: data.feedback,
              timestamp: new Date().toISOString(),
            },
          };
          return [entry, ...prev];
        });
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit decision';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch],
  );

  const pullRegularEvent = useCallback(
    async (bizId: string): Promise<FetchNextEventResponse> => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<FetchNextEventResponse>('/api/ceo/event', {
          method: 'POST',
          body: JSON.stringify({ businessId: bizId }),
        });
        // Only a REGULAR event comes back from /api/ceo/event (Phase 3 —
        // the endpoint rejects/ignores milestone context entirely).
        setPendingRegular(data.event ?? null);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch next event';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch],
  );

  const pendingEvent = pendingMilestone ?? pendingRegular;

  return {
    business,
    pendingMilestone,
    pendingRegular,
    pendingEvent,
    decisionHistory,
    ready,
    loading: loading || authLoading || kidLoading,
    error,
    refetch,
    registerBusiness,
    decide,
    pullRegularEvent,
    fetchNextEvent: pullRegularEvent,
  };
}
