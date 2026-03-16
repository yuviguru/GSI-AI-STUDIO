'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AiPointsBadge } from '@/components/learning/AiPointsBadge';
import { MuteToggle } from '@/components/layout/MuteToggle';

const navTabs = [
  { href: '/', label: 'Dashboard' },
  { href: '/create/story', label: 'Studios' },
  { href: '/beat-the-ai', label: 'Beat AI' },
  { href: '/skill-arena', label: 'MindX' },
  { href: '/explore', label: 'Explore' },
  { href: '/creations', label: 'My Stuff' },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="w-full rounded-t-[2rem] bg-gradient-to-r from-amber-400 via-brand-warm-accent to-amber-400">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-lg font-extrabold tracking-wide text-amber-900">
            GSI AI Studio
          </span>
        </Link>

        {/* Desktop nav tabs */}
        <nav className="hidden items-center gap-1 md:flex">
          {navTabs.map((tab) => {
            const isActive =
              tab.href === '/'
                ? pathname === '/'
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-white/40 text-amber-950'
                    : 'text-amber-800 hover:bg-white/20 hover:text-amber-950',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <MuteToggle />
          <AiPointsBadge />
        </div>
      </div>
    </header>
  );
}
