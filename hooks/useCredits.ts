'use client';

import useSWR from 'swr';
import { fetchWithKidAuth, KidAuthMissingError } from '@/lib/fetchWithKidAuth';
import { useAuth } from './useAuth';
import { useKidProfile } from './useKidProfile';
import type { UserPlan } from '@gsi/types';

export interface CreditsSnapshotResponse {
  kidId: string;
  plan: UserPlan;
  creditBalance: number;
  creditsMonthlyGrantAmount: number;
  creditsMonthlyGrantedAt: string | null;
  creditsMonthlyResetAt: string | null;
  creditsLastDebitAt: string | null;
  recentLedger: CreditsLedgerEntry[];
  /** Pass back as `before` to fetch the next page; null = end of ledger. */
  nextCursor: string | null;
}

export interface CreditsLedgerEntry {
  id: string;
  type: 'grant' | 'topup' | 'debit' | 'refund' | 'expire' | 'bonus';
  amount: number;
  balanceAfter: number;
  feature?: string;
  paymentRef?: string;
  paymentProvider?: 'razorpay' | 'stripe' | 'manual';
  expiresAt: string | null;
  createdAt: string;
}

export interface UseCreditsReturn {
  /** Full snapshot from GET /api/billing/credits. `null` for anonymous, while loading, or on error. */
  snapshot: CreditsSnapshotResponse | null;
  /** Current balance for convenience. 0 when snapshot is null. */
  balance: number;
  isLoading: boolean;
  /** Error message, or null. KidAuthMissing isn't an error — we just return null snapshot. */
  error: string | null;
  refresh: () => Promise<unknown>;
}

/**
 * Subscribe to the active kid's credit wallet. SWR-backed so the kid-scope
 * cache invalidation (centralized in `useKidProfile.bumpKidScope`) refreshes
 * the balance automatically when the active kid changes.
 *
 * Anonymous flows (no signed-in user OR no active kid) return a `null`
 * snapshot — the UI should hide the balance display rather than render
 * a misleading zero.
 */
export function useCredits(): UseCreditsReturn {
  const { isAuthenticated, loading: authLoading, getIdToken } = useAuth();
  const { activeKid, loading: kidLoading } = useKidProfile();

  const kidId = activeKid?.id ?? null;
  const canFetch = isAuthenticated && !authLoading && !kidLoading && !!kidId;

  const swrKey = canFetch ? `/api/billing/credits?kidId=${encodeURIComponent(kidId!)}` : null;

  const { data, error, isLoading, mutate } = useSWR<CreditsSnapshotResponse>(
    swrKey,
    async (url) => {
      try {
        const res = await fetchWithKidAuth(url, { getIdToken, kidId }, { method: 'GET' });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message ?? 'Failed to load credits');
        }
        return json.data as CreditsSnapshotResponse;
      } catch (err) {
        if (err instanceof KidAuthMissingError) {
          // Auth still hydrating — let SWR retry, don't surface as error.
          return null as unknown as CreditsSnapshotResponse;
        }
        throw err;
      }
    },
    {
      // Light revalidation — credits change on user actions (debits via
      // AI calls, topups via webhook). Polling is unnecessary; the
      // central kid-scope mutate covers cross-tab + kid-switch refresh.
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  return {
    snapshot: data ?? null,
    balance: data?.creditBalance ?? 0,
    isLoading: isLoading || authLoading || kidLoading,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  };
}
