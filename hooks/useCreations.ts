'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Creation, CreationType } from '@gsi/types';
import type { ApiResponse, PaginatedResponse } from '@gsi/types';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { useKidProfile } from './useKidProfile';

interface UseCreationsReturn {
  creations: Creation[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  deleteCreation: (id: string) => Promise<void>;
}

/**
 * Hook for paginated creation listing with type filter and delete support.
 * Uses cursor-based pagination matching the GET /api/creations endpoint.
 */
export function useCreations(type?: CreationType | null): UseCreationsReturn {
  // Subscribe to kid-scope changes — the effect below refires whenever a
  // different kid is activated (after the kid-scoped session id is
  // committed). Without this, switching profiles would keep the previous
  // kid's creations on screen until the next page reload.
  const { kidScopeVersion } = useKidProfile();
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const loadingMore = useRef(false);

  const fetchPage = useCallback(
    async (cursor?: string | null) => {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (cursor) params.set('cursor', cursor);

      const res = await fetchWithSession(`/api/creations?${params.toString()}`);
      const json: ApiResponse<PaginatedResponse<Creation>> = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to fetch creations');
      }

      return json.data;
    },
    [type]
  );

  // Initial fetch + re-fetch when type changes OR the active kid switches.
  // `kidScopeVersion` is bumped centrally in `useKidProfile.switchKid` after
  // the kid-scoped session id is committed to localStorage — see the
  // "Kid-scoped data fetching" section in docs/architecture.md.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setCreations([]);
      setNextCursor(null);
      setHasMore(false);
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPage();
        if (cancelled) return;
        setCreations(data.items);
        setNextCursor(data.nextCursor ?? null);
        setHasMore(data.hasMore);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch creations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchPage, kidScopeVersion]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore.current) return;
    loadingMore.current = true;

    try {
      const data = await fetchPage(nextCursor);
      setCreations((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      loadingMore.current = false;
    }
  }, [hasMore, nextCursor, fetchPage]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage();
      setCreations(data.items);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch creations');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const deleteCreation = useCallback(
    async (id: string) => {
      // Optimistic removal
      setCreations((prev) => prev.filter((c) => c.id !== id));

      try {
        const res = await fetchWithSession(`/api/creations/${id}`, {
          method: 'DELETE',
        });
        const json: ApiResponse<null> = await res.json();

        if (!json.success) {
          throw new Error(json.error?.message ?? 'Failed to delete');
        }
      } catch (err) {
        // Revert on failure
        await refresh();
        throw err;
      }
    },
    [refresh]
  );

  return { creations, loading, error, hasMore, loadMore, refresh, deleteCreation };
}
