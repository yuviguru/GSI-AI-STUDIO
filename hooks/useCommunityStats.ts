'use client';

import useSWR from 'swr';
import type { CommunityScope } from '@/lib/social/onlineCounter';

export interface CommunityStatsResponse {
  scope: CommunityScope;
  creationsLifetime: number;
  onlineNow: number;
  onlineIsSynthetic: boolean;
}

interface ApiEnvelope {
  success: boolean;
  data: CommunityStatsResponse;
}

const fetcher = async (url: string): Promise<CommunityStatsResponse> => {
  const res = await fetch(url);
  const json = (await res.json()) as ApiEnvelope;
  if (!json.success || !json.data) {
    throw new Error('Failed to load community stats');
  }
  return json.data;
};

/**
 * Hook: live community stats for a scope (COMMUNITY-001).
 *
 * Returns the freshest server response, or `null` while the first fetch
 * is in flight. SWR shares one fetch per (url) across consumers, so
 * mounting many `<CommunityStatsPill>` on a page doesn't multiply load.
 *
 * Auto-refreshes every 60s — matches the synthetic counter's 5-min bucket
 * cadence well enough that the user occasionally sees the number tick.
 */
export function useCommunityStats(scope: CommunityScope): CommunityStatsResponse | null {
  const { data } = useSWR<CommunityStatsResponse>(
    `/api/community/stats?scope=${scope}`,
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
    },
  );
  return data ?? null;
}
