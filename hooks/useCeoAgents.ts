'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithKidAuth } from '@/lib/fetchWithKidAuth';
import { useAuth } from './useAuth';
import { useKidProfile } from './useKidProfile';
import type {
  CeoAgentDescriptor,
  CeoAgentHire,
  CeoAgentId,
  CeoAgentConfig,
  CeoArtifact,
  CeoWorkflowId,
} from '@/types';

interface CatalogResponse {
  agents: CeoAgentDescriptor[];
}

interface HiresResponse {
  hires: CeoAgentHire[];
}

interface HireResponse {
  hire: CeoAgentHire;
  business: { currentCash: number };
}

interface RunResponse {
  artifact: CeoArtifact;
  runIndex: number;
  costInr: number;
  multiplier: number;
}

interface AcceptResponse {
  artifact: CeoArtifact;
}

export interface UseCeoAgentsReturn {
  catalog: CeoAgentDescriptor[] | null;
  hires: CeoAgentHire[];
  catalogLoading: boolean;
  hiresLoading: boolean;
  error: string | null;
  refetchHires: () => Promise<void>;
  hireAgent: (params: {
    businessId: string;
    agentId: CeoAgentId;
    config: CeoAgentConfig;
  }) => Promise<HireResponse>;
  runWorkflow: (params: {
    hireId: string;
    workflowId: CeoWorkflowId;
    brief: Record<string, unknown>;
    eventId?: string;
  }) => Promise<RunResponse>;
  acceptArtifact: (params: {
    artifactId: string;
    selections: Record<string, number>;
    attachTo:
      | { kind: 'business_field'; field: 'brandAssets' }
      | { kind: 'event'; eventId: string }
      | { kind: 'marketing_feed' };
  }) => Promise<AcceptResponse>;
}

/**
 * Client hook for the Kid CEO agent system. Exposes the static catalog
 * (fetched once, cached in state) plus the per-business hire list and
 * the three actions (hire, run, accept). Artifacts are fetched via a
 * separate hook per story to keep this file focused.
 */
export function useCeoAgents(options?: { businessId?: string }): UseCeoAgentsReturn {
  const { businessId } = options ?? {};
  const { isAuthenticated, loading: authLoading, getIdToken } = useAuth();
  const { activeKid, loading: kidLoading } = useKidProfile();
  const kidId = activeKid?.id ?? null;
  const ready = isAuthenticated && !!kidId;

  const [catalog, setCatalog] = useState<CeoAgentDescriptor[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);
  const [hires, setHires] = useState<CeoAgentHire[]>([]);
  const [hiresLoading, setHiresLoading] = useState<boolean>(!!businessId);
  const [error, setError] = useState<string | null>(null);

  // Catalog — public, no auth needed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ceo/agents/catalog');
        const json = await res.json();
        if (!cancelled) {
          if (json.success) setCatalog((json.data as CatalogResponse).agents);
          else setError(json.error?.message ?? 'Failed to load agent catalog');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load catalog');
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apiFetch = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await fetchWithKidAuth(url, { getIdToken, kidId }, init);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Agent API error');
      }
      return json.data as T;
    },
    [getIdToken, kidId],
  );

  const refetchHires = useCallback(async () => {
    if (!ready || !businessId) {
      setHires([]);
      setHiresLoading(false);
      return;
    }
    setHiresLoading(true);
    setError(null);
    try {
      const data = await apiFetch<HiresResponse>(
        `/api/ceo/agents/hires?businessId=${encodeURIComponent(businessId)}&status=active`,
        { method: 'GET' },
      );
      setHires(data.hires);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hires');
    } finally {
      setHiresLoading(false);
    }
  }, [ready, businessId, apiFetch]);

  useEffect(() => {
    if (authLoading || kidLoading) return;
    void refetchHires();
  }, [authLoading, kidLoading, refetchHires]);

  const hireAgent = useCallback<UseCeoAgentsReturn['hireAgent']>(
    async (params) => {
      const data = await apiFetch<HireResponse>('/api/ceo/agents/hire', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      setHires((prev) => [data.hire, ...prev]);
      return data;
    },
    [apiFetch],
  );

  const runWorkflow = useCallback<UseCeoAgentsReturn['runWorkflow']>(
    async (params) => {
      return apiFetch<RunResponse>('/api/ceo/agents/run', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    [apiFetch],
  );

  const acceptArtifact = useCallback<UseCeoAgentsReturn['acceptArtifact']>(
    async (params) => {
      return apiFetch<AcceptResponse>('/api/ceo/agents/accept', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    [apiFetch],
  );

  return {
    catalog,
    hires,
    catalogLoading,
    hiresLoading: hiresLoading || authLoading || kidLoading,
    error,
    refetchHires,
    hireAgent,
    runWorkflow,
    acceptArtifact,
  };
}
