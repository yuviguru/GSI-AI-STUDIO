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
import { useUserSessionStatus } from '@/hooks/useUserSessionStatus';
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

const PENDING_CLAIM_KEY = 'gsi-pending-claim';

/**
 * Layout-level gate. Maps `useUserSessionStatus` phases to a routing
 * decision: block the app with a full-screen UI, or pass through to the
 * page. The status hook owns the underlying derivation so this file only
 * has switch cases — adding a new phase = add a case here (and in
 * useEntryGate for page-level overlays), no auth/kid plumbing duplicated.
 */
function AppGate({ children }: { children: React.ReactNode }) {
  const status = useUserSessionStatus();
  const { isAuthenticated, user, refreshProfile } = useAuth();
  const { hasKids, kids, refreshKids } = useKidProfile();
  const [claimResolved, setClaimResolved] = useState(false);

  if (status.phase === 'loading') return null;

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

  // Pending sign-in migration. The status hook AND a local "resolved this
  // session" flag together ensure the prompt is one-shot per sign-in:
  //   - Refresh after dismissal: claimResolved + clearing PENDING_CLAIM_KEY
  //     make the status hook return a non-migrating phase next render.
  //   - Refresh before dismissal: both signals still present → re-renders.
  //   - New sign-in after sign-out: handleSignOut wiped gsi-* keys; if
  //     server still has claimedSessionData, the new claim re-stamps the
  //     key → prompt fires again, as intended.
  if (
    status.phase === 'authenticated-migrating' &&
    !claimResolved &&
    user?.claimedSessionSummary
  ) {
    return (
      <SessionMigrationPrompt
        claimedData={user.claimedSessionSummary}
        hasKids={hasKids}
        kidCount={kids.length}
        pendingSessionId={status.pendingSessionId}
        onResolved={async (outcome) => {
          // Clear the flag in every resolution path so the prompt won't
          // re-fire on refresh. handleSignOut's wipe also catches this
          // key — clearing it here too is idempotent and explicit.
          try {
            localStorage.removeItem(PENDING_CLAIM_KEY);
          } catch {
            // localStorage unavailable — non-blocking
          }
          setClaimResolved(true);
          if (outcome === 'signed-out') return; // signOut redirected
          await refreshProfile();
          await refreshKids();
        }}
      />
    );
  }

  // Authenticated but no kids — run the rich onboarding carousel which
  // creates the verified kid profile in one flow. (createKid() auto-
  // consumes claimedSessionData for the first kid.)
  if (status.phase === 'authenticated-needs-kid') {
    return <ProfileSetupCarousel createKidProfile onComplete={refreshKids} />;
  }

  // Authenticated with kids but none selected — Netflix-style picker
  if (status.phase === 'authenticated-needs-pick') {
    return <ProfilePicker forceSelection />;
  }

  // All other phases (authenticated-ready, anonymous-*) → render the page.
  // useEntryGate on `/` adds page-level overlays for the anonymous phases.
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
