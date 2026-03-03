'use client';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SessionInit } from '@/components/layout/SessionInit';
import { AiPointsProvider } from '@/contexts/AiPointsContext';
import { CelebrationModal } from '@/components/learning/CelebrationModal';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AiPointsProvider>
      <div className="flex min-h-screen flex-col">
        <SessionInit />
        <Header />
        <main className="flex-1 pb-nav">{children}</main>
        <BottomNav />
      </div>
      <CelebrationModal />
    </AiPointsProvider>
  );
}
