'use client';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SessionInit } from '@/components/layout/SessionInit';
import { AiPointsProvider } from '@/contexts/AiPointsContext';
import { CelebrationModal } from '@/components/learning/CelebrationModal';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { KidProfileProvider, useKidProfile } from '@/hooks/useKidProfile';
import { LoginPrompt } from '@/components/auth/LoginPrompt';
import { ProfilePicker } from '@/components/profile/ProfilePicker';
import { ProfileSetupCarousel } from '@/components/onboarding/ProfileSetupCarousel';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { DashboardSidebar } from '@/components/navigation';
import { kidDashboardConfig } from '@/lib/dashboard/configs/kid.config';

const REQUIRE_LOGIN = process.env.NEXT_PUBLIC_REQUIRE_LOGIN === 'true';

function AppGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { needsProfileSetup, needsProfileSelection, refreshKids } = useKidProfile();

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
              <LoginPrompt />
            </AppGate>
          </AiPointsProvider>
        </KidProfileProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
