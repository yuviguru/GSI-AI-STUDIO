'use client';

import useSWR from 'swr';
import {
  STUDIO_LAUNCH_STATE_DEFAULTS,
  getLaunchStateClient,
} from '@/lib/config/studioLaunchStateDefaults';
import type { StudioConfig, StudioId, StudioLaunchState } from '@gsi/types';

interface ResolvedConfig {
  studios: Record<StudioId, StudioConfig>;
}

interface ApiResponse {
  success: boolean;
  data: ResolvedConfig;
  error: unknown;
}

const fetcher = async (url: string): Promise<ResolvedConfig> => {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse;
  if (!json.success || !json.data) {
    throw new Error('Failed to load studio launch states');
  }
  return json.data;
};

/**
 * Resolve the launch state for a single studio (LAUNCH-001).
 *
 * Returns the in-code default synchronously on first render so the pill
 * paints without a fetch round-trip. SWR upgrades to the server-resolved
 * value (which respects the Firestore `config/studios` override) once the
 * fetch completes. One fetch is shared across every consumer on the page.
 */
export function useStudioLaunchState(studioId: StudioId | string): StudioLaunchState {
  const { data } = useSWR<ResolvedConfig>('/api/config/studios', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const fromServer = data?.studios?.[studioId as StudioId]?.launchState;
  return fromServer ?? getLaunchStateClient(studioId);
}

/**
 * Convenience: resolve the entire studio config map. Useful for surfaces
 * that render multiple studios in one pass.
 */
export function useAllStudioLaunchStates(): Record<StudioId, StudioConfig> {
  const { data } = useSWR<ResolvedConfig>('/api/config/studios', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return data?.studios ?? STUDIO_LAUNCH_STATE_DEFAULTS;
}
