'use client';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { SessionInit } from '@/components/layout/SessionInit';
import { AiPointsProvider } from '@/contexts/AiPointsContext';
import { CelebrationModal } from '@/components/learning/CelebrationModal';
import { AuthProvider } from '@/hooks/useAuth';
import { LoginPrompt } from '@/components/auth/LoginPrompt';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AiPointsProvider>
        <div className="flex min-h-screen flex-col">
          <SessionInit />

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
      </AiPointsProvider>
    </AuthProvider>
  );
}
