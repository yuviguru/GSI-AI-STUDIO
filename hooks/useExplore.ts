'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Creation, CreationType } from '@/types/creation.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';

export type ExploreSort = 'trending' | 'newest';

interface UseExploreReturn {
  creations: Creation[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  filter: CreationType | null;
  setFilter: (type: CreationType | null) => void;
  sort: ExploreSort;
  setSort: (sort: ExploreSort) => void;
}

/**
 * Hook for browsing public creations with type filter and sort.
 * No session header needed — public endpoint.
 */
export function useExplore(): UseExploreReturn {
  const [filter, setFilter] = useState<CreationType | null>(null);
  const [sort, setSort] = useState<ExploreSort>('newest');
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const loadingMore = useRef(false);

  const fetchPage = useCallback(
    async (cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set('sort', sort);
      if (filter) params.set('type', filter);
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/creations/public?${params.toString()}`);
      const json: ApiResponse<PaginatedResponse<Creation>> = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to fetch creations');
      }

      return json.data;
    },
    [filter, sort]
  );

  // Initial fetch + re-fetch when filter or sort changes
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
  }, [fetchPage]);

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

  return { creations, loading, error, hasMore, loadMore, filter, setFilter, sort, setSort };
}
