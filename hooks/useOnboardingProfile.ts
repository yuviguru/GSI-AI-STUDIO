'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Anonymous onboarding profile — persisted to localStorage.
 *
 * This is *separate* from the authenticated KidProfile (Firestore). For
 * unsigned visitors we still want a personalised dashboard greeting, mascot,
 * and avatar. When a parent later signs in and creates a verified Kid profile,
 * those values can be migrated server-side via the existing claim flow.
 */

export interface OnboardingProfile {
  name: string;
  age: number | null;
  mascotId: string;
  /**
   * Persisted avatar URL (Storage / HTTPS) — safe to migrate to Firestore.
   * NEVER stores `data:` URIs (would balloon localStorage past the 5MB cap
   * and isn't migratable across devices anyway).
   */
  avatarUrl: string | null;
  /** ISO timestamp when setup completed. */
  completedAt: string;
}

/** Returns the URL only if it's safe to persist (not a data URI). */
export function persistableAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('data:')) return null;
  if (url.length > 2048) return null;
  return url;
}

const STORAGE_KEY = 'gsi-kid-profile';

function readFromStorage(): OnboardingProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return null;
  }
}

function writeToStorage(profile: OnboardingProfile | null) {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable — non-blocking
  }
}

export function useOnboardingProfile() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfile(readFromStorage());
    setHydrated(true);
  }, []);

  const save = useCallback((next: OnboardingProfile) => {
    writeToStorage(next);
    setProfile(next);
  }, []);

  const clear = useCallback(() => {
    writeToStorage(null);
    setProfile(null);
  }, []);

  return { profile, hydrated, save, clear };
}

export const ONBOARDING_PROFILE_STORAGE_KEY = STORAGE_KEY;
