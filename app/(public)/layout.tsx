'use client';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SessionInit } from '@/components/layout/SessionInit';
import { AiPointsProvider } from '@/contexts/AiPointsContext';
import { CelebrationModal } from '@/components/learning/CelebrationModal';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AiPointsProvider>
      <div className="flex min-h-screen flex-col bg-brand-warm-bg">
        <SessionInit />
        <main className="flex-1 pb-nav">
          <div className="min-h-full border-b border-brand-warm-border bg-white">
            <Header />
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
      <CelebrationModal />
    </AiPointsProvider>
  );
}
