'use client';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { useSession } from '@/hooks/useSession';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // Initialize anonymous session on mount
  useSession();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
