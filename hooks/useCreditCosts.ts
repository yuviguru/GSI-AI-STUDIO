'use client';

import useSWR from 'swr';
import { getCostClient } from '@/lib/billing/creditCostsDefaults';

interface CostsResponse {
  costs: Array<{ feature: string; credits: number }>;
}

interface ServerCostMap {
  [feature: string]: number;
}

const fetcher = async (url: string): Promise<ServerCostMap> => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Failed to load costs');
  const data = json.data as CostsResponse;
  return Object.fromEntries(data.costs.map((c) => [c.feature, c.credits]));
};

/**
 * Resolve the credit cost for a feature. Prefers the server-resolved
 * cost (env overrides applied) once `/api/billing/costs` has loaded;
 * falls back to the static client defaults until then so the badge
 * renders instantly without a fetch round-trip.
 *
 * SWR shares one fetch across every CreditCostBadge on the page.
 */
export function useCreditCost(feature: string): number {
  const { data } = useSWR<ServerCostMap>('/api/billing/costs', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return data?.[feature] ?? getCostClient(feature);
}
