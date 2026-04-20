'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CeoBusiness } from '@/types';
import { fetchWithSession } from '@/lib/fetchWithSession';

interface BusinessesListResponse {
  businesses: CeoBusiness[];
}

export interface UseCeoBusinessesReturn {
  businesses: CeoBusiness[];
  activeBusinesses: CeoBusiness[];
  completedBusinesses: CeoBusiness[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Lists every Kid CEO business for the current session — active + completed.
 * Used by the `/ceo` landing page to show the full set of sims a kid has
 * going, not just the most recent active one. For single-business reads
 * (play page, register flow) use `useCeoBusiness` instead.
 */
export function useCeoBusinesses(options?: { autoFetch?: boolean }): UseCeoBusinessesReturn {
  const autoFetch = options?.autoFetch ?? true;
  const [businesses, setBusinesses] = useState<CeoBusiness[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithSession('/api/ceo/businesses', { method: 'GET' });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Failed to load businesses');
      }
      const data = json.data as BusinessesListResponse;
      setBusinesses(data.businesses ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load businesses';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoFetch) return;
    void refetch();
  }, [autoFetch, refetch]);

  const activeBusinesses = businesses.filter((b) => b.status === 'active');
  const completedBusinesses = businesses.filter((b) => b.status === 'completed');

  return {
    businesses,
    activeBusinesses,
    completedBusinesses,
    loading,
    error,
    refetch,
  };
}
