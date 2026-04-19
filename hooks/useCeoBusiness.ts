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
import { fetchWithSession } from '@/lib/fetchWithSession';

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
  event: CeoEvent;
  pendingDecisionExists: boolean;
}

interface BusinessGetResponse {
  business: CeoBusiness;
  pendingEvent: CeoEvent | null;
  decisionHistory: CeoDecisionHistoryEntry[];
}

export interface UseCeoBusinessReturn {
  business: CeoBusiness | null;
  pendingEvent: CeoEvent | null;
  decisionHistory: CeoDecisionHistoryEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  registerBusiness: (params: RegisterBusinessParams) => Promise<RegisterBusinessResponse>;
  decide: (params: DecideParams) => Promise<DecideResponse>;
  fetchNextEvent: (businessId: string) => Promise<FetchNextEventResponse>;
}

export interface UseCeoBusinessOptions {
  businessId?: string;
  autoFetch?: boolean;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetchWithSession(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? 'Something went wrong');
  }
  return json.data as T;
}

export function useCeoBusiness(options?: UseCeoBusinessOptions): UseCeoBusinessReturn {
  const { businessId, autoFetch = true } = options ?? {};

  const [business, setBusiness] = useState<CeoBusiness | null>(null);
  const [pendingEvent, setPendingEvent] = useState<CeoEvent | null>(null);
  const [decisionHistory, setDecisionHistory] = useState<CeoDecisionHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = businessId
        ? `/api/ceo/business?businessId=${encodeURIComponent(businessId)}`
        : '/api/ceo/business';
      const data = await apiFetch<BusinessGetResponse>(url, { method: 'GET' });
      setBusiness(data.business);
      setPendingEvent(data.pendingEvent);
      setDecisionHistory(data.decisionHistory);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load business';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (!autoFetch) return;
    void refetch();
  }, [autoFetch, refetch]);

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
        setPendingEvent(data.firstEvent);
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
    [],
  );

  const decide = useCallback(async (params: DecideParams): Promise<DecideResponse> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DecideResponse>('/api/ceo/decide', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      setBusiness(data.updatedBusiness);
      setPendingEvent(data.nextEvent);

      // Push the just-decided event onto history (most-recent-first to match the
      // GET /business shape). We reconstruct the entry from what we sent + what
      // the server scored, since the decide response doesn't echo the full event.
      setDecisionHistory((prev) => {
        // Use the current pendingEvent if it matches the decided eventId —
        // that's the event the kid just resolved.
        const decidedEvent = prev.find((h) => h.event.id === params.eventId)?.event;
        setPendingEvent(data.nextEvent);
        if (!decidedEvent) {
          // Pull from the previous pendingEvent via a functional update on the
          // pendingEvent setter isn't ergonomic here; instead, stamp the entry
          // with whatever we know. Consumers should call refetch() to get the
          // canonical history if they need the full event payload.
          return prev;
        }
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
  }, []);

  const fetchNextEvent = useCallback(
    async (bizId: string): Promise<FetchNextEventResponse> => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<FetchNextEventResponse>('/api/ceo/event', {
          method: 'POST',
          body: JSON.stringify({ businessId: bizId }),
        });
        setPendingEvent(data.event);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch next event';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    business,
    pendingEvent,
    decisionHistory,
    loading,
    error,
    refetch,
    registerBusiness,
    decide,
    fetchNextEvent,
  };
}
