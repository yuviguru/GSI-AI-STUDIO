'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CeoBusiness, CeoProfile } from '@gsi/types';
import { fetchWithKidAuth, KidAuthMissingError } from '@/lib/fetchWithKidAuth';
import { useAuth } from './useAuth';
import { useKidProfile } from './useKidProfile';

export interface UseCeoProfileReturn {
  profile: CeoProfile | null;
  business: CeoBusiness | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setPublic: (isPublic: boolean) => Promise<{ profile: CeoProfile; newBadges: string[] }>;
}

/** Two modes:
 *    - `{ businessId }` — authenticated owner view. Requires sign-in + kid.
 *    - `{ shareUrl }`   — public share view. Unauthenticated fetch; strips
 *                         owner identifiers on the server side.
 */
export type UseCeoProfileOptions = { businessId: string } | { shareUrl: string };

interface ProfileGetResponse {
  profile: CeoProfile;
  business: CeoBusiness;
}

interface ProfilePatchResponse {
  profile: CeoProfile;
  newBadges: string[];
}

function hasBusinessId(opts: UseCeoProfileOptions): opts is { businessId: string } {
  return 'businessId' in opts && typeof opts.businessId === 'string' && opts.businessId.length > 0;
}

function hasShareUrl(opts: UseCeoProfileOptions): opts is { shareUrl: string } {
  return 'shareUrl' in opts && typeof opts.shareUrl === 'string' && opts.shareUrl.length > 0;
}

export function useCeoProfile(options: UseCeoProfileOptions): UseCeoProfileReturn {
  const businessId = hasBusinessId(options) ? options.businessId : null;
  const shareUrl = hasShareUrl(options) ? options.shareUrl : null;

  const { isAuthenticated, loading: authLoading, getIdToken } = useAuth();
  const { activeKid, loading: kidLoading } = useKidProfile();

  const [profile, setProfile] = useState<CeoProfile | null>(null);
  const [business, setBusiness] = useState<CeoBusiness | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (shareUrl) {
        // Public share — no auth required
        res = await fetch(`/api/ceo/profile?s=${encodeURIComponent(shareUrl)}`);
      } else if (businessId) {
        // Authenticated owner — requires Firebase Bearer + X-Active-Kid-Id
        if (!isAuthenticated || !activeKid) {
          // Don't throw mid-hydration — just clear and wait.
          setProfile(null);
          setBusiness(null);
          return;
        }
        res = await fetchWithKidAuth(
          `/api/ceo/profile?businessId=${encodeURIComponent(businessId)}`,
          { getIdToken, kidId: activeKid.id },
          { method: 'GET' },
        );
      } else {
        throw new Error('useCeoProfile requires either businessId or shareUrl');
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Something went wrong');
      }
      const data = json.data as ProfileGetResponse;
      setProfile(data.profile);
      setBusiness(data.business);
    } catch (err) {
      if (err instanceof KidAuthMissingError) return;
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [businessId, shareUrl, isAuthenticated, activeKid, getIdToken]);

  useEffect(() => {
    if (authLoading || kidLoading) return;
    void refetch();
  }, [refetch, authLoading, kidLoading]);

  const setPublic = useCallback(
    async (isPublic: boolean): Promise<ProfilePatchResponse> => {
      if (!businessId) {
        throw new Error('setPublic is only available in businessId mode');
      }
      if (!activeKid) {
        throw new Error('Pick a kid profile first.');
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithKidAuth(
          '/api/ceo/profile',
          { getIdToken, kidId: activeKid.id },
          {
            method: 'PATCH',
            body: JSON.stringify({ businessId, isPublic }),
          },
        );
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message ?? 'Failed to update profile');
        }
        const data = json.data as ProfilePatchResponse;
        setProfile(data.profile);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [businessId, activeKid, getIdToken],
  );

  return {
    profile,
    business,
    loading: loading || authLoading || (businessId ? kidLoading : false),
    error,
    refetch,
    setPublic,
  };
}
