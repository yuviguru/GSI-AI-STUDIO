'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SessionInit } from '@/components/layout/SessionInit';
import { AiPointsProvider } from '@/contexts/AiPointsContext';
import { CelebrationModal } from '@/components/learning/CelebrationModal';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { KidProfileProvider, useKidProfile } from '@/hooks/useKidProfile';
// LoginPrompt removed — PostOnboardingAuth (in page.tsx) handles the sign-in
// encouragement right after onboarding. The sidebar profile chip provides
// ongoing re-engagement for anonymous users who skipped it.
import { ProfilePicker } from '@/components/profile/ProfilePicker';
import { SessionMigrationPrompt } from '@/components/profile/SessionMigrationPrompt';
import { ProfileSetupCarousel } from '@/components/onboarding/ProfileSetupCarousel';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { DashboardSidebar } from '@/components/navigation';
import { kidDashboardConfig } from '@/lib/dashboard/configs/kid.config';

const REQUIRE_LOGIN = process.env.NEXT_PUBLIC_REQUIRE_LOGIN === 'true';

function AppGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading: authLoading, refreshProfile } = useAuth();
  const { needsProfileSetup, needsProfileSelection, hasKids, kids, refreshKids } =
    useKidProfile();
  const [claimDismissed, setClaimDismissed] = useState(false);

  if (authLoading) return null;

  if (REQUIRE_LOGIN && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-50 to-white p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-2 shadow-xl">
          <PhoneAuthFlow />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <>{children}</>;

  // Authenticated with pending anonymous session data — show the simplified
  // migration prompt BEFORE profile setup / picker. Two scenarios:
  // 1. New user (no kids): "Keep my work" or "Start fresh"
  // 2. Existing user (has kids): "Save as new profile" or "Delete this data"
  if (user?.claimedSessionSummary && !claimDismissed) {
    return (
      <SessionMigrationPrompt
        claimedData={user.claimedSessionSummary}
        hasKids={hasKids}
        kidCount={kids.length}
        onComplete={async () => {
          setClaimDismissed(true);
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

  if (needsProfileSelection) {
    return <ProfilePicker forceSelection />;
  }

  return <>{children}</>;
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <KidProfileProvider>
          <AiPointsProvider>
            <SessionInit />
            <AppGate>
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
            </AppGate>
          </AiPointsProvider>
        </KidProfileProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
