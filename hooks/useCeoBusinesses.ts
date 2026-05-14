'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CeoBusiness } from '@gsi/types';
import { fetchWithKidAuth, KidAuthMissingError } from '@/lib/fetchWithKidAuth';
import { useAuth } from './useAuth';
import { useKidProfile } from './useKidProfile';

interface BusinessesListResponse {
  businesses: CeoBusiness[];
}

export interface UseCeoBusinessesReturn {
  businesses: CeoBusiness[];
  activeBusinesses: CeoBusiness[];
  completedBusinesses: CeoBusiness[];
  /** True only when signed in AND an active kid is selected. Consumers use
   *  this to gate action buttons (register, connect Telegram) server-side-
   *  enforcement is still the source of truth. */
  ready: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Kid CEO business list for the currently-authed user's active kid.
 *
 *  Returns empty + `ready: false` when the caller is unauth'd or hasn't
 *  selected a kid yet. Consumers render a sign-in or kid-picker prompt in
 *  that case rather than calling the API (which would 401/400 anyway).
 */
export function useCeoBusinesses(options?: { autoFetch?: boolean }): UseCeoBusinessesReturn {
  const autoFetch = options?.autoFetch ?? true;
  const { isAuthenticated, loading: authLoading, getIdToken } = useAuth();
  const { activeKid, loading: kidLoading } = useKidProfile();

  const [businesses, setBusinesses] = useState<CeoBusiness[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const ready = isAuthenticated && !!activeKid;

  const refetch = useCallback(async () => {
    if (!ready) {
      setBusinesses([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithKidAuth(
        '/api/ceo/businesses',
        { getIdToken, kidId: activeKid?.id ?? null },
        { method: 'GET' },
      );
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Failed to load businesses');
      }
      const data = json.data as BusinessesListResponse;
      setBusinesses(data.businesses ?? []);
    } catch (err) {
      if (err instanceof KidAuthMissingError) {
        // Not a real failure — just the auth context isn't ready yet.
        setBusinesses([]);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to load businesses';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [ready, getIdToken, activeKid?.id]);

  useEffect(() => {
    if (!autoFetch) return;
    // Wait until both auth + kid-profile finish loading before the first call
    // so we don't flash an empty state mid-hydration.
    if (authLoading || kidLoading) return;
    void refetch();
  }, [autoFetch, refetch, authLoading, kidLoading]);

  const activeBusinesses = businesses.filter((b) => b.status === 'active');
  const completedBusinesses = businesses.filter((b) => b.status === 'completed');

  return {
    businesses,
    activeBusinesses,
    completedBusinesses,
    ready,
    loading: loading || authLoading || kidLoading,
    error,
    refetch,
  };
}
