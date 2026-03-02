'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Creation, CreationType } from '@/types/creation.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';

const SESSION_KEY = 'gsi-session-id';

function getSessionId(): string {
  return typeof window !== 'undefined'
    ? localStorage.getItem(SESSION_KEY) ?? ''
    : '';
}

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

      const res = await fetch(`/api/creations?${params.toString()}`, {
        headers: { 'X-Session-Id': getSessionId() },
      });
      const json: ApiResponse<PaginatedResponse<Creation>> = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to fetch creations');
      }

      return json.data;
    },
    [type]
  );

  // Initial fetch + re-fetch when type changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPage();
        if (cancelled) return;
        setCreations(data.items);
        setNextCursor(data.nextCursor);
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
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore.current) return;
    loadingMore.current = true;

    try {
      const data = await fetchPage(nextCursor);
      setCreations((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
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
      setNextCursor(data.nextCursor);
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
        const res = await fetch(`/api/creations/${id}`, {
          method: 'DELETE',
          headers: { 'X-Session-Id': getSessionId() },
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
