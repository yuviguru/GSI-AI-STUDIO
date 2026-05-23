'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { useKidProfile } from './useKidProfile';
import { useOnboardingProfile } from './useOnboardingProfile';
import { shouldShowGuestWarning } from '@/components/auth/GuestWarningModal';

/** Session-scoped flag — survives navigations within a browser tab. */
const AUTH_CHOICE_SEEN_KEY = 'gsi-auth-choice-seen';

type MissingStep = 'mascot' | 'avatar';

/**
 * Discriminated entry-gate state for the homepage. The state machine is
 * intentionally collapsed to a small set of mutually-exclusive UI buckets so
 * `page.tsx` can be a thin switch over `state.kind`.
 *
 * Note: the layout-level <AppGate> already handles authenticated routing
 * (claim-session migration, profile setup, profile picker). By the time this
 * hook runs on `/`, an authenticated user always has an `activeKid` — so the
 * authenticated path here only decides between missing-fields and ready.
 */
export type EntryState =
  | { kind: 'loading' }
  | { kind: 'auth-choice' }
  | { kind: 'onboarding' }
  | { kind: 'guest-warning' }
  | {
      kind: 'missing-fields';
      targetKidId?: string;
      initialStep: MissingStep;
    }
  | { kind: 'ready' };

interface UseEntryGate {
  state: EntryState;
  /** User picked "Continue as guest" → kick off the onboarding carousel. */
  acceptGuestChoice: () => void;
  /** User completed (or skipped) the missing-fields prompt. */
  dismissMissingFields: () => void;
  /** User dismissed the 24h+ returning-guest warning. */
  dismissGuestWarning: () => void;
  /** Anonymous onboarding carousel completed — drop into the hub. */
  completeOnboarding: () => void;
}

/**
 * Entry-gate state machine for `/`.
 *
 * Decision tree (top to bottom — first match wins):
 *   1. Anything still loading → 'loading'
 *   2. Authenticated + activeKid missing mascot/avatar → 'missing-fields'
 *   3. Authenticated + complete kid → 'ready'
 *   4. Anonymous + completed local profile + missing fields → 'missing-fields'
 *   5. Anonymous + completed local profile + 24h+ since last warning → 'guest-warning'
 *   6. Anonymous + completed local profile → 'ready'
 *   7. Anonymous + user already passed auth choice this session → 'onboarding'
 *   8. Anonymous, fresh visitor → 'auth-choice'
 */
export function useEntryGate(): UseEntryGate {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeKid, loading: kidLoading } = useKidProfile();
  const { profile: onboardingProfile, hydrated: onboardingHydrated } =
    useOnboardingProfile();

  // Session-scoped flags. We persist `hadAuthChoice` to sessionStorage so
  // the gate survives soft reloads inside a tab without leaking across days.
  const [hadAuthChoice, setHadAuthChoice] = useState(false);
  const [missingFieldsDismissed, setMissingFieldsDismissed] = useState(false);
  const [guestWarningDismissed, setGuestWarningDismissed] = useState(false);
  // Suppress the guest-warning modal immediately after the onboarding flow
  // completes in this session — otherwise a freshly-stamped completedAt
  // racing past 24h-old `gsi-guest-warned-at` could nag the user instantly.
  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false);

  // Rehydrate session flags on mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem(AUTH_CHOICE_SEEN_KEY) === '1') {
        setHadAuthChoice(true);
      }
    } catch {
      // sessionStorage unavailable — fine, we'll just re-prompt on this load
    }
  }, []);

  const acceptGuestChoice = useCallback(() => {
    try {
      sessionStorage.setItem(AUTH_CHOICE_SEEN_KEY, '1');
    } catch {
      // ignore
    }
    setHadAuthChoice(true);
  }, []);

  const dismissMissingFields = useCallback(() => {
    setMissingFieldsDismissed(true);
  }, []);

  const dismissGuestWarning = useCallback(() => {
    setGuestWarningDismissed(true);
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboardingJustCompleted(true);
  }, []);

  const state = useMemo<EntryState>(() => {
    // Wait for both auth + the onboarding cache before deciding anything.
    if (authLoading || !onboardingHydrated) return { kind: 'loading' };

    // Authenticated path — AppGate has already screened for "needs setup" /
    // "needs selection," so the only decision left is missing-fields vs ready.
    if (isAuthenticated) {
      if (kidLoading) return { kind: 'loading' };
      // If we're authenticated but somehow have no activeKid here, the layout
      // gate is still resolving — render the loader rather than a fresh
      // auth-choice prompt that would be confusing for a signed-in user.
      if (!activeKid) return { kind: 'loading' };

      if (!missingFieldsDismissed) {
        const hasMascot = Boolean(activeKid.mascotId);
        const hasAvatar = Boolean(activeKid.avatarUrl);
        if (!hasMascot || !hasAvatar) {
          return {
            kind: 'missing-fields',
            targetKidId: activeKid.id,
            initialStep: hasMascot && !hasAvatar ? 'avatar' : 'mascot',
          };
        }
      }
      return { kind: 'ready' };
    }

    // Anonymous path —————————————————————————————————————————————————

    // Returning guest: a completed onboarding profile exists in localStorage.
    if (onboardingProfile?.completedAt) {
      if (!missingFieldsDismissed) {
        const hasMascot = Boolean(onboardingProfile.mascotId);
        const hasAvatar = Boolean(onboardingProfile.avatarUrl);
        if (!hasMascot || !hasAvatar) {
          return {
            kind: 'missing-fields',
            initialStep: hasMascot && !hasAvatar ? 'avatar' : 'mascot',
          };
        }
      }

      // 24h+ warning — only when we haven't warned recently AND the user
      // hasn't dismissed in this session AND we didn't just complete the
      // onboarding flow (which freshly stamps completedAt).
      if (
        !guestWarningDismissed &&
        !onboardingJustCompleted &&
        shouldShowGuestWarning(onboardingProfile.completedAt)
      ) {
        return { kind: 'guest-warning' };
      }

      return { kind: 'ready' };
    }

    // No completed profile yet. If the user has already picked "Continue as
    // guest" in this session, drop them into the onboarding carousel.
    if (hadAuthChoice) {
      return { kind: 'onboarding' };
    }

    // Brand-new visitor — full-bleed auth-choice take-over.
    return { kind: 'auth-choice' };
  }, [
    authLoading,
    kidLoading,
    onboardingHydrated,
    isAuthenticated,
    activeKid,
    onboardingProfile,
    hadAuthChoice,
    missingFieldsDismissed,
    guestWarningDismissed,
    onboardingJustCompleted,
  ]);

  return {
    state,
    acceptGuestChoice,
    dismissMissingFields,
    dismissGuestWarning,
    completeOnboarding,
  };
}
