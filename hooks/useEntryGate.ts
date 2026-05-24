'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserSessionStatus } from './useUserSessionStatus';
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
 * Consumes the shared `useUserSessionStatus` selector for the auth/kid
 * phase, then maps that phase to a page-level overlay decision.
 *
 * Decision tree (first match wins):
 *   - 'loading' phase → 'loading' overlay (MascotLoader)
 *   - 'authenticated-migrating' / 'authenticated-needs-kid' /
 *     'authenticated-needs-pick' → 'loading' (AppGate is already
 *     rendering the layout-level UI for these; page never paints)
 *   - 'authenticated-ready' + kid missing mascot/avatar → 'missing-fields'
 *   - 'authenticated-ready' + complete kid → 'ready'
 *   - 'anonymous-onboarded' + missing fields → 'missing-fields'
 *   - 'anonymous-onboarded' + 24h+ since last warning → 'guest-warning'
 *   - 'anonymous-onboarded' + everything fine → 'ready'
 *   - 'anonymous-fresh' + user picked "Continue as guest" this session
 *     → 'onboarding'
 *   - 'anonymous-fresh' brand-new visitor → 'auth-choice'
 */
export function useEntryGate(): UseEntryGate {
  const status = useUserSessionStatus();

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
    switch (status.phase) {
      case 'loading':
      // AppGate is rendering the layout-level UI for these — the page
      // should keep its loader up so we don't paint stale content
      // between gate transitions.
      case 'authenticated-migrating':
      case 'authenticated-needs-kid':
      case 'authenticated-needs-pick':
        return { kind: 'loading' };

      case 'authenticated-ready': {
        if (!missingFieldsDismissed) {
          const hasMascot = Boolean(status.activeKid.mascotId);
          const hasAvatar = Boolean(status.activeKid.avatarUrl);
          if (!hasMascot || !hasAvatar) {
            return {
              kind: 'missing-fields',
              targetKidId: status.activeKid.id,
              initialStep: hasMascot && !hasAvatar ? 'avatar' : 'mascot',
            };
          }
        }
        return { kind: 'ready' };
      }

      case 'anonymous-onboarded': {
        if (!missingFieldsDismissed) {
          const hasMascot = Boolean(status.profile.mascotId);
          const hasAvatar = Boolean(status.profile.avatarUrl);
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
          shouldShowGuestWarning(status.profile.completedAt)
        ) {
          return { kind: 'guest-warning' };
        }
        return { kind: 'ready' };
      }

      case 'anonymous-fresh':
        return hadAuthChoice
          ? { kind: 'onboarding' }
          : { kind: 'auth-choice' };
    }
  }, [
    status,
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
