'use client';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SidebarNav } from '@/components/layout/SidebarNav';
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

const REQUIRE_LOGIN = process.env.NEXT_PUBLIC_REQUIRE_LOGIN === 'true';

function AppGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { needsProfileSetup, needsProfileSelection, refreshKids } = useKidProfile();

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

  // Authenticated but no kids — run the rich onboarding carousel which creates
  // the verified kid profile (mascot + AI avatar + X-Ray lesson) in one flow.
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

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <KidProfileProvider>
          <AiPointsProvider>
            <SessionInit />
            <AppGate>
            <div className="flex min-h-screen flex-col">
              {/* Desktop sidebar (lg+) */}
              <SidebarNav />

              {/* Mobile header (below lg) */}
              <div className="lg:hidden">
                <Header />
              </div>

              {/* Main content — offset for sidebar on desktop */}
              <main className="flex-1 pb-nav lg:pb-0 lg:pl-[220px]">{children}</main>

              {/* Mobile bottom nav (below lg) */}
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
