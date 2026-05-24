'use client';

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useKidProfile, type KidProfileSummary } from './useKidProfile';
import { useOnboardingProfile, type OnboardingProfile } from './useOnboardingProfile';

/**
 * The single source of truth for "what phase is the user in right now?"
 *
 * Two gates consume this:
 *   1. AppGate (apps/kid/app/(public)/layout.tsx) — maps each phase to a
 *      layout-level routing decision (block the app vs let the page render).
 *   2. useEntryGate (hooks/useEntryGate.ts) — maps the same phase to a
 *      page-level overlay decision on `/` (auth-choice / onboarding /
 *      guest-warning / missing-fields / ready).
 *
 * Having one selector means a new auth/identity phase only needs to be
 * added here — both gates pick it up automatically. Without it, the two
 * gates derived the same state independently from useAuth + useKidProfile
 * + useOnboardingProfile and could drift apart silently.
 */

/** Pending sign-in migration. The client just signed in and the server
 *  has unresolved claimedSessionData waiting for a user decision. */
const PENDING_CLAIM_KEY = 'gsi-pending-claim';

export type UserSessionStatus =
  /** Auth or onboarding-cache resolution still in flight. Render nothing
   *  meaningful — both gates should show a loader or null. */
  | { phase: 'loading' }
  /** Authenticated + has unresolved migration. Block all routes; AppGate
   *  renders the SessionMigrationPrompt. */
  | {
      phase: 'authenticated-migrating';
      pendingSessionId: string;
    }
  /** Authenticated + 0 kids. Block all routes; AppGate runs the
   *  createKid carousel. */
  | { phase: 'authenticated-needs-kid' }
  /** Authenticated + has kids but none picked. Block all routes; AppGate
   *  shows the ProfilePicker. */
  | { phase: 'authenticated-needs-pick' }
  /** Authenticated + has an active kid. AppGate passes through; useEntryGate
   *  on `/` decides between missing-fields and ready. */
  | { phase: 'authenticated-ready'; activeKid: KidProfileSummary }
  /** Anonymous + has completed onboarding profile. AppGate passes through;
   *  useEntryGate decides between guest-warning, missing-fields, ready. */
  | {
      phase: 'anonymous-onboarded';
      profile: OnboardingProfile;
    }
  /** Anonymous + no completed profile. AppGate passes through;
   *  useEntryGate decides between auth-choice and onboarding. */
  | { phase: 'anonymous-fresh' };

/**
 * Read the pending-claim flag from localStorage. The flag is stamped by
 * SessionInit on successful claim and cleared by the migration prompt's
 * onResolved callback (or by the global gsi-* wipe on signOut). Returns
 * null when the flag is absent or unreadable.
 */
function readPendingClaim(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(PENDING_CLAIM_KEY);
  } catch {
    return null;
  }
}

/**
 * Derive the user's current session phase from the three input contexts.
 * Memoized on the underlying state so consumers can use the returned
 * object as a dependency without churn.
 */
export function useUserSessionStatus(): UserSessionStatus {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const {
    activeKid,
    kids,
    loading: kidLoading,
  } = useKidProfile();
  const { profile: onboardingProfile, hydrated: onboardingHydrated } =
    useOnboardingProfile();

  return useMemo<UserSessionStatus>(() => {
    // Wait for everything that could affect routing before deciding. Both
    // gates will render their respective loaders while this is true.
    if (authLoading || !onboardingHydrated) return { phase: 'loading' };

    if (isAuthenticated) {
      if (kidLoading) return { phase: 'loading' };

      // Pending sign-in migration: server has claimedSessionData AND the
      // client just-signed-in flag is set. Both signals are required so
      // refreshes after the user resolves the prompt don't re-trigger it.
      const pendingSessionId = readPendingClaim();
      if (user?.claimedSessionSummary && pendingSessionId) {
        return { phase: 'authenticated-migrating', pendingSessionId };
      }

      if (kids.length === 0) return { phase: 'authenticated-needs-kid' };
      if (!activeKid) return { phase: 'authenticated-needs-pick' };
      return { phase: 'authenticated-ready', activeKid };
    }

    // Anonymous path
    if (onboardingProfile?.completedAt) {
      return { phase: 'anonymous-onboarded', profile: onboardingProfile };
    }
    return { phase: 'anonymous-fresh' };
  }, [
    authLoading,
    onboardingHydrated,
    isAuthenticated,
    kidLoading,
    kids.length,
    activeKid,
    user?.claimedSessionSummary,
    onboardingProfile,
  ]);
}
