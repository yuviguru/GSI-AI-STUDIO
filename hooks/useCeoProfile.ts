'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CeoBusiness, CeoProfile } from '@/types';
import { fetchWithSession } from '@/lib/fetchWithSession';

export interface UseCeoProfileReturn {
  profile: CeoProfile | null;
  business: CeoBusiness | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setPublic: (isPublic: boolean) => Promise<{ profile: CeoProfile; newBadges: string[] }>;
}

export type UseCeoProfileOptions = { businessId: string } | { shareUrl: string };

interface ProfileGetResponse {
  profile: CeoProfile;
  business: CeoBusiness;
}

interface ProfilePatchResponse {
  profile: CeoProfile;
  newBadges: string[];
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetchWithSession(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? 'Something went wrong');
  }
  return json.data as T;
}

function hasBusinessId(opts: UseCeoProfileOptions): opts is { businessId: string } {
  return 'businessId' in opts && typeof opts.businessId === 'string';
}

function hasShareUrl(opts: UseCeoProfileOptions): opts is { shareUrl: string } {
  return 'shareUrl' in opts && typeof opts.shareUrl === 'string';
}

export function useCeoProfile(options: UseCeoProfileOptions): UseCeoProfileReturn {
  const businessId = hasBusinessId(options) ? options.businessId : null;
  const shareUrl = hasShareUrl(options) ? options.shareUrl : null;

  const [profile, setProfile] = useState<CeoProfile | null>(null);
  const [business, setBusiness] = useState<CeoBusiness | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url: string;
      if (shareUrl) {
        url = `/api/ceo/profile?s=${encodeURIComponent(shareUrl)}`;
      } else if (businessId) {
        url = `/api/ceo/profile?businessId=${encodeURIComponent(businessId)}`;
      } else {
        throw new Error('useCeoProfile requires either businessId or shareUrl');
      }

      const data = await apiFetch<ProfileGetResponse>(url, { method: 'GET' });
      setProfile(data.profile);
      setBusiness(data.business);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [businessId, shareUrl]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const setPublic = useCallback(
    async (isPublic: boolean): Promise<ProfilePatchResponse> => {
      if (!businessId) {
        throw new Error('setPublic is only available in businessId mode');
      }
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<ProfilePatchResponse>('/api/ceo/profile', {
          method: 'PATCH',
          body: JSON.stringify({ businessId, isPublic }),
        });
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
    [businessId],
  );

  return {
    profile,
    business,
    loading,
    error,
    refetch,
    setPublic,
  };
}
