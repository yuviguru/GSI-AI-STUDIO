'use client';

import { AnimatePresence } from 'framer-motion';
import { GameHub } from '@/components/game-hub/GameHub';
import { MascotLoader } from '@/components/loader/MascotLoader';
import { AuthChoiceScreen } from '@/components/auth/AuthChoiceScreen';
import { GuestWarningModal } from '@/components/auth/GuestWarningModal';
import { ProfileSetupCarousel } from '@/components/onboarding/ProfileSetupCarousel';
import { useEntryGate } from '@/hooks/useEntryGate';

/**
 * Home page = the Game Hub + an entry-gate overlay.
 *
 * The hub is always rendered as the base layer so that loaders and auth gates
 * sit over a real, painted background (the AuthChoiceScreen relies on
 * `backdrop-blur-xl` to hint at the world behind it).
 *
 * All decision-making lives in `useEntryGate`. This component only renders
 * the chosen overlay (if any).
 */
export default function HomePage() {
  const {
    state,
    acceptGuestChoice,
    dismissMissingFields,
    dismissGuestWarning,
    completeOnboarding,
  } = useEntryGate();

  return (
    <>
      <GameHub />

      <AnimatePresence>
        {state.kind === 'loading' && <MascotLoader key="loader" />}

        {state.kind === 'auth-choice' && (
          <AuthChoiceScreen
            key="auth-choice"
            onContinueAsGuest={acceptGuestChoice}
            // onSignedIn: no-op. The auth state change triggers AppGate in the
            // layout to route through claim-session → ProfileSetupCarousel →
            // ProfilePicker; this page won't re-render the auth-choice screen.
          />
        )}

        {state.kind === 'onboarding' && (
          <ProfileSetupCarousel
            key="onboarding"
            onComplete={completeOnboarding}
          />
        )}

        {state.kind === 'guest-warning' && (
          <GuestWarningModal
            key="guest-warning"
            onContinueAsGuest={dismissGuestWarning}
          />
        )}

        {state.kind === 'missing-fields' && (
          <ProfileSetupCarousel
            key="missing-fields"
            onComplete={dismissMissingFields}
            initialStep={state.initialStep}
            targetKidId={state.targetKidId}
          />
        )}
      </AnimatePresence>
    </>
  );
}
