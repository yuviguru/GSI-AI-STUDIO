'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AiPointsBadge } from '@/components/learning/AiPointsBadge';
import { MuteToggle } from '@/components/layout/MuteToggle';
import {
  BookOpen,
  Users,
  Compass,
  LayoutGrid,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';

const navItems = [
  { href: '/create/story', icon: BookOpen, label: 'Learning Plan' },
  { href: '/explore', icon: Users, label: 'Explore' },
  { href: '/beat-the-ai', icon: Compass, label: 'Beat AI' },
  { href: '/creations', icon: FolderOpen, label: 'My Stuff' },
  { href: '/skill-arena', icon: LayoutGrid, label: 'MindX' },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full bg-gray-900 pb-0.5">
      <div className="rounded-b-2xl bg-gray-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-extrabold tracking-wide text-white">
              GSI AI Studio
            </span>
          </Link>

          {/* Center nav — desktop */}
          <nav className="hidden items-center gap-1 md:flex">
            {/* Learning Plan text link (like Dei) */}
            <Link
              href="/"
              className={cn(
                'mr-2 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                pathname === '/'
                  ? 'bg-white/15 text-white'
                  : 'text-gray-400 hover:text-white',
              )}
            >
              <BookOpen className="h-4 w-4" />
              Dashboard
            </Link>

            {/* Icon nav buttons */}
            {navItems.slice(1).map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-gray-500 hover:bg-white/10 hover:text-gray-300',
                  )}
                  aria-label={item.label}
                  title={item.label}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </Link>
              );
            })}
          </nav>

          {/* Right side — user profile area */}
          <div className="flex items-center gap-3">
            <MuteToggle />
            <AiPointsBadge />

            {/* User avatar placeholder (ready for auth) */}
            <button
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-white/10"
              aria-label="User profile"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-600 text-xs font-bold text-white">
                E
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-white">Explorer</p>
                <p className="text-[10px] text-gray-400">guest</p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-gray-500 sm:block" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
