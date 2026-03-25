'use client';

import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import type { Creation, CreationType } from '@/types/creation.types';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import { fetchWithSession } from '@/lib/fetchWithSession';

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetchWithSession(url);
  const json: ApiResponse<T> = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Failed to fetch');
  }
  return json.data;
}

/**
 * Fetch a single creation by ID.
 * Uses SWR for caching and revalidation.
 */
export function useCreation(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Creation>(
    id ? `/api/creations/${id}` : null,
    fetcher<Creation>
  );

  return {
    creation: data ?? null,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  };
}

/**
 * List the current session's creations with optional type filter.
 * Uses SWR for caching.
 */
export function useMyCreations(type?: CreationType) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);

  const key = `/api/creations?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Creation>>(
    key,
    fetcher<PaginatedResponse<Creation>>
  );

  return {
    creations: data?.items ?? [],
    hasMore: data?.hasMore ?? false,
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  };
}

/**
 * Save a creation via the API.
 * Returns the creation ID and share URL on success.
 * Automatically revalidates the creations list cache.
 */
export function useSaveCreation() {
  const { mutate } = useSWRConfig();

  const save = useCallback(
    async (input: {
      type: CreationType;
      title: string;
      prompt?: string;
      content: Record<string, unknown>;
      media?: Array<{ url: string; type: string; alt: string }>;
      thumbnail?: string;
      aiMetadata: Record<string, unknown>;
      aiConceptsTaught: string[];
      isPublic?: boolean;
    }): Promise<{ creationId: string; shareUrl: string } | null> => {
      try {
        const res = await fetchWithSession('/api/creations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        const json: ApiResponse<{ creationId: string; shareUrl: string }> = await res.json();

        if (!json.success || !json.data) {
          throw new Error(json.error?.message ?? 'Failed to save creation');
        }

        // Revalidate the creations list cache
        mutate((key: string) => typeof key === 'string' && key.startsWith('/api/creations'));

        return json.data;
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to save creation');
      }
    },
    [mutate]
  );

  return { save };
}
