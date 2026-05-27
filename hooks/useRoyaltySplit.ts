'use client';

import useSWR from 'swr';
import { ROYALTY_SPLIT_CONFIG_DEFAULTS } from '@/lib/config/royaltySplitDefaults';
import type { RoyaltySplitConfig } from '@gsi/types';

interface ApiResponse {
  success: boolean;
  data: RoyaltySplitConfig;
}

const fetcher = async (url: string): Promise<RoyaltySplitConfig> => {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse;
  if (!json.success || !json.data) throw new Error('Failed to load royalty split');
  return json.data;
};

/**
 * Resolve the live royalty split (BOOK-004 Phase 1). Returns defaults
 * synchronously on first render so the UI paints without a fetch round
 * trip. SWR upgrades to the server-resolved values when ready.
 *
 * One fetch is shared across every consumer on the page.
 */
export function useRoyaltySplit(): RoyaltySplitConfig {
  const { data } = useSWR<RoyaltySplitConfig>('/api/config/royalty-split', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return data ?? ROYALTY_SPLIT_CONFIG_DEFAULTS;
}
