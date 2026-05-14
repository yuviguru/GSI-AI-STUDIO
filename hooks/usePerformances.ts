'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchWithSession } from '@/lib/fetchWithSession';
import type { PerformanceFeedItem, PerformanceKind } from '@gsi/types';
import type { CreationType } from '@gsi/types';
import type { ApiResponse } from '@gsi/types';

export type PerformanceListMode =
  | { mode: 'mine' }
  | { mode: 'parent'; parentCreationId: string }
  | {
      mode: 'public';
      sort?: 'newest' | 'trending';
      parentCreationType?: CreationType;
      kind?: PerformanceKind;
    };

interface PaginatedPerformances {
  items: PerformanceFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UsePerformancesReturn {
  performances: PerformanceFeedItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  deletePerformance: (id: string) => Promise<void>;
}

/**
 * Paginated performance listing hook.
 *
 * Three modes:
 *   - mine        → My Performances tab on /creations
 *   - parent      → Performances rail on /view/{creationId}
 *   - public      → Explore Performances tab
 */
export function usePerformances(input: PerformanceListMode): UsePerformancesReturn {
  const [performances, setPerformances] = useState<PerformanceFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const loadingMore = useRef(false);

  const buildParams = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      if (input.mode === 'mine') {
        params.set('mine', 'true');
      } else if (input.mode === 'parent') {
        params.set('parentCreationId', input.parentCreationId);
      } else if (input.mode === 'public') {
        params.set('visibility', 'public');
        params.set('sort', input.sort ?? 'newest');
        if (input.parentCreationType) {
          params.set('parentCreationType', input.parentCreationType);
        }
        if (input.kind) {
          params.set('kind', input.kind);
        }
      }
      if (cursor) params.set('cursor', cursor);
      return params.toString();
    },
    [input],
  );

  const fetchPage = useCallback(
    async (cursor?: string | null): Promise<PaginatedPerformances> => {
      const url = `/api/performances?${buildParams(cursor)}`;
      const res = await fetchWithSession(url);
      const json: ApiResponse<PaginatedPerformances> = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to fetch performances');
      }
      return json.data;
    },
    [buildParams],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setPerformances([]);
      setNextCursor(null);
      setHasMore(false);
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPage();
        if (cancelled) return;
        setPerformances(data.items);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch performances');
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
      setPerformances((prev) => [...prev, ...data.items]);
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
      setPerformances(data.items);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performances');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const deletePerformance = useCallback(
    async (id: string) => {
      setPerformances((prev) => prev.filter((p) => p.id !== id));
      try {
        const res = await fetchWithSession(`/api/performances/${id}`, {
          method: 'DELETE',
        });
        const json: ApiResponse<unknown> = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message ?? 'Failed to delete');
        }
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh],
  );

  return { performances, loading, error, hasMore, loadMore, refresh, deletePerformance };
}
