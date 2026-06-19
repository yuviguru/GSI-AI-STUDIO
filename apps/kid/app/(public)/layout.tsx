'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { GameNavBar } from '@/components/navigation/GameNavBar';
import { LayoutBackLink } from '@/components/navigation/LayoutBackLink';
import { SessionInit } from '@/components/layout/SessionInit';
import { AiPointsProvider } from '@/contexts/AiPointsContext';
import { CelebrationModal } from '@/components/learning/CelebrationModal';
import { BookReadyWatcher } from '@/components/studios/book/BookReadyWatcher';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { KidProfileProvider, useKidProfile } from '@/hooks/useKidProfile';
import { useUserSessionStatus, claimedSummaryIsKeepable } from '@/hooks/useUserSessionStatus';
import { ProfilePicker } from '@/components/profile/ProfilePicker';
import { SessionMigrationPrompt } from '@/components/profile/SessionMigrationPrompt';
import { ProfileSetupCarousel } from '@/components/onboarding/ProfileSetupCarousel';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { BillingNotificationProvider } from '@/contexts/BillingNotificationContext';
import { BillingNotificationModal } from '@/components/billing/BillingNotificationModal';

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
  const { isAuthenticated, user, getIdToken, refreshProfile } = useAuth();
  const { hasKids, kids, refreshKids } = useKidProfile();
  const [claimResolved, setClaimResolved] = useState(false);

  // Self-heal stuck accounts (AUTH-002). A signed-in user WITH kids can carry a
  // contentless claimed snapshot — e.g. an old avatar-only guest session with
  // no name, points, or creations. It can never be "kept" (nothing to keep)
  // and the gate no longer prompts for it, but the orphaned user-doc field
  // lingers and re-surfaces on every sign-in. Clear it server-side once.
  // Empty-body discard → clearOrphanedClaimSnapshot (drops the field only;
  // archives no session or creations, so nothing of value is touched).
  const claimSummary = user?.claimedSessionSummary;
  const staleContentlessClaim =
    isAuthenticated && hasKids && !!claimSummary && !claimedSummaryIsKeepable(claimSummary);
  const autoClearedRef = useRef(false);
  useEffect(() => {
    if (!staleContentlessClaim || autoClearedRef.current) return;
    autoClearedRef.current = true;
    void (async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          autoClearedRef.current = false;
          return;
        }
        await fetch('/api/users/discard-claimed-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        try {
          localStorage.removeItem(PENDING_CLAIM_KEY);
        } catch {
          // localStorage unavailable — non-blocking
        }
        await refreshProfile();
      } catch {
        autoClearedRef.current = false; // allow a retry on a later render
      }
    })();
  }, [staleContentlessClaim, getIdToken, refreshProfile]);

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
 * Home route (`/`) is the self-contained Game Hub — no extra chrome.
 * All other routes get the GameNavBar (logo, profile, points).
 * LayoutBackLink auto-renders below the nav on every inner page.
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
        <GameNavBar />
        <LayoutBackLink />
        <main className="flex-1">{children}</main>
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
            <BillingNotificationProvider>
              <SessionInit />
              <AppGate>
                <PublicLayoutInner>{children}</PublicLayoutInner>
              </AppGate>
              <BillingNotificationModal />
              <BookReadyWatcher />
            </BillingNotificationProvider>
          </AiPointsProvider>
        </KidProfileProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
