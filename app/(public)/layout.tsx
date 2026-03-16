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
        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-nav pt-3 sm:px-5 sm:pt-5">
          <div className="overflow-hidden rounded-[2rem] border border-brand-warm-border bg-white shadow-sm">
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
