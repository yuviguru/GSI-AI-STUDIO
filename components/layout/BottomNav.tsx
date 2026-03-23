'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Footprints, Apple, Smile, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Tab definitions ─────────────────────────────────────────────────────── */

const LEFT_TABS = [
  { href: '/',            Icon: BookOpen },
  { href: '/beat-the-ai', Icon: Footprints },
] as const;

const RIGHT_TABS = [
  { href: '/explore',   Icon: Apple },
  { href: '/creations', Icon: Smile },
] as const;

/* ─── Bottom Navigation ───────────────────────────────────────────────────── */

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 pb-3',
        'pointer-events-none',
        'safe-area-bottom',
      )}
    >
      <div className="relative mx-auto flex max-w-sm items-end justify-center gap-0 px-4">

        {/* ── Left pill ──────────────────────────────────────────────── */}
        <div className="pointer-events-auto flex items-center gap-6 rounded-2xl bg-white px-8 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
          {LEFT_TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link key={tab.href} href={tab.href}>
                <tab.Icon
                  className={cn(
                    'h-6 w-6 transition-colors',
                    active ? 'text-brand-primary' : 'text-gray-400',
                  )}
                  strokeWidth={active ? 2.2 : 1.5}
                />
              </Link>
            );
          })}
        </div>

        {/* ── Center floating button ─────────────────────────────────── */}
        <div className="pointer-events-auto relative z-10 -mx-3 -mb-1">
          {/* Glow / soft shadow behind */}
          <div className="absolute inset-0 scale-125 rounded-full bg-brand-primary/20 blur-xl" />
          <Link href="/create/story" className="relative block">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-gradient-to-br from-[#6B8BF5] to-[#4F6CE5] shadow-xl transition-transform active:scale-95">
              <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
          </Link>
        </div>

        {/* ── Right pill ─────────────────────────────────────────────── */}
        <div className="pointer-events-auto flex items-center gap-6 rounded-2xl bg-white px-8 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
          {RIGHT_TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link key={tab.href} href={tab.href}>
                <tab.Icon
                  className={cn(
                    'h-6 w-6 transition-colors',
                    active ? 'text-brand-primary' : 'text-gray-400',
                  )}
                  strokeWidth={active ? 2.2 : 1.5}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
