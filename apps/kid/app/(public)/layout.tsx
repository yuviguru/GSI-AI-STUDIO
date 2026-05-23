'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SessionInit } from '@/components/layout/SessionInit';
import { AiPointsProvider } from '@/contexts/AiPointsContext';
import { CelebrationModal } from '@/components/learning/CelebrationModal';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { KidProfileProvider, useKidProfile } from '@/hooks/useKidProfile';
// LoginPrompt removed. Sign-in encouragement now lives in two places:
// (1) AuthChoiceScreen (full-bleed take-over) for brand-new visitors on `/`,
// (2) GuestWarningModal that re-appears for returning guests after 24h. The
// sidebar profile chip still provides ongoing re-engagement once the user
// is inside the app.
import { ProfilePicker } from '@/components/profile/ProfilePicker';
import { SessionMigrationPrompt } from '@/components/profile/SessionMigrationPrompt';
import { ProfileSetupCarousel } from '@/components/onboarding/ProfileSetupCarousel';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { DashboardSidebar } from '@/components/navigation';
import { kidDashboardConfig } from '@/lib/dashboard/configs/kid.config';

const REQUIRE_LOGIN = process.env.NEXT_PUBLIC_REQUIRE_LOGIN === 'true';

/** localStorage key written by SessionInit on successful claim, consumed by
 *  the migration prompt resolution path. Presence = "there's an active
 *  sign-in migration decision to make." */
const PENDING_CLAIM_KEY = 'gsi-pending-claim';

function AppGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading: authLoading, refreshProfile } = useAuth();
  const { needsProfileSetup, needsProfileSelection, hasKids, kids, refreshKids } =
    useKidProfile();
  const [claimResolved, setClaimResolved] = useState(false);

  // Still loading auth/profile state
  if (authLoading) return null;

  // Pilot login-only mode: force phone auth before showing anything else.
  // Toggle via NEXT_PUBLIC_REQUIRE_LOGIN env var (defaults to false = open beta).
  if (REQUIRE_LOGIN && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-50 to-white p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-2 shadow-xl">
          <PhoneAuthFlow />
        </div>
      </div>
    );
  }

  // Anonymous user (open beta) — no gate, full access
  if (!isAuthenticated) return <>{children}</>;

  // Authenticated with pending anonymous session data → show the migration
  // prompt before any other gate. Trigger is two-part:
  //   1. Server says there's something to migrate (claimedSessionSummary)
  //   2. Client just-signed-in flag is set (gsi-pending-claim) — set by
  //      SessionInit at the auth-transition moment, cleared by the prompt's
  //      onResolved callback.
  //
  // The combination ensures the prompt is one-shot per sign-in:
  //   - Refresh after dismissal: gsi-pending-claim is gone → no prompt.
  //   - Refresh before dismissal: both signals present → prompt re-renders.
  //   - New sign-in after sign-out: handleSignOut wiped gsi-* keys; if server
  //     still has stale claimedSessionData, the new claim flow re-stamps
  //     gsi-pending-claim → prompt fires again, as intended.
  const pendingClaimSessionId =
    typeof window !== 'undefined'
      ? (() => {
          try {
            return localStorage.getItem(PENDING_CLAIM_KEY);
          } catch {
            return null;
          }
        })()
      : null;

  if (
    user?.claimedSessionSummary &&
    pendingClaimSessionId &&
    !claimResolved
  ) {
    return (
      <SessionMigrationPrompt
        claimedData={user.claimedSessionSummary}
        hasKids={hasKids}
        kidCount={kids.length}
        pendingSessionId={pendingClaimSessionId}
        onResolved={async (outcome) => {
          // Clear the pending-claim flag in every resolution path so the
          // prompt won't re-fire on refresh. The signed-out path also clears
          // it (handleSignOut's wipe loop catches it), but doing it here too
          // is idempotent and explicit.
          try {
            localStorage.removeItem(PENDING_CLAIM_KEY);
          } catch {
            // localStorage unavailable — non-blocking
          }
          setClaimResolved(true);
          if (outcome === 'signed-out') {
            // signOut() already triggered a full reload — no further routing.
            return;
          }
          await refreshProfile();
          await refreshKids();
        }}
      />
    );
  }

  // Authenticated but no kids — run the rich onboarding carousel which creates
  // the verified kid profile (mascot + AI avatar + X-Ray lesson) in one flow.
  // (createKid() auto-consumes claimedSessionData for the first kid.)
  if (needsProfileSetup) {
    return <ProfileSetupCarousel createKidProfile onComplete={refreshKids} />;
  }

  // Authenticated with kids but none selected — show Netflix picker
  if (needsProfileSelection) {
    return <ProfilePicker forceSelection />;
  }

  // All good — show the app
  return <>{children}</>;
}

/**
 * Splits "chrome on the page" from "page content." The home route (`/`) is the
 * self-contained Game Hub with its own header/sidebar/bottom-nav, so we skip
 * the dashboard chrome there. Every other route renders inside the standard
 * dashboard frame.
 */
function PublicLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isGameHub = pathname === '/';

  if (isGameHub) {
    return (
      <>
        <main className="min-h-screen">{children}</main>
        <CelebrationModal />
      </>
    );
  }

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <DashboardSidebar config={kidDashboardConfig} />

        <div className="lg:hidden">
          <Header />
        </div>

        <main className="flex-1 pb-nav lg:pb-0 lg:pl-[220px]">{children}</main>

        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
      <CelebrationModal />
    </>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <KidProfileProvider>
          <AiPointsProvider>
            <SessionInit />
            <AppGate>
              <PublicLayoutInner>{children}</PublicLayoutInner>
            </AppGate>
          </AiPointsProvider>
        </KidProfileProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
