'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  Briefcase,
  Compass,
  FolderOpen,
  HelpCircle,
  Settings,
  ChevronDown,
  Sparkles,
  BookOpen,
  Music,
  Gamepad2,
  Palette,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { getAvatarEmoji } from '@/components/profile/AvatarPicker';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { ProfilePicker } from '@/components/profile/ProfilePicker';

/* ─── Studio sub-items for Create+ ─────────────────────────────────────────── */

const STUDIO_ITEMS = [
  { href: '/create/story', label: 'Story Studio', icon: BookOpen },
  { href: '/create/music', label: 'Music Lab',    icon: Music },
  { href: '/create/quiz',  label: 'Quiz Maker',   icon: HelpCircle },
  { href: '/create/game',  label: 'Game Studio',  icon: Gamepad2 },
  { href: '/create/comic', label: 'Comic Studio', icon: Palette },
];

/* ─── Main nav items ───────────────────────────────────────────────────────── */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    match: (p) => p === '/',
  },
  {
    href: '/beat-the-ai',
    label: 'Beat AI',
    icon: Bot,
    match: (p) => p === '/beat-the-ai',
  },
  {
    href: '/ceo',
    label: 'Kid CEO',
    icon: Briefcase,
    match: (p) => p.startsWith('/ceo'),
  },
  {
    href: '/explore',
    label: 'Explore',
    icon: Compass,
    match: (p) => p === '/explore',
  },
  {
    href: '/creations',
    label: 'My Stuff',
    icon: FolderOpen,
    match: (p) => p === '/creations',
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  {
    href: '/help',
    label: 'Help',
    icon: HelpCircle,
    match: (p) => p === '/help',
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    match: (p) => p === '/settings',
  },
];

/* ─── Sidebar ──────────────────────────────────────────────────────────────── */

export function SidebarNav() {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeKid } = useKidProfile();
  const { totalPoints } = useAiPoints();
  const isStudioActive = pathname.startsWith('/create/');

  const toggleCreate = useCallback(() => {
    setCreateOpen((prev) => !prev);
  }, []);

  return (
    <aside
      className={cn(
        'hidden lg:flex',
        'fixed left-0 top-0 z-40 h-screen w-[220px]',
        'flex-col bg-white border-r border-gray-100',
      )}
    >
      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-2.5 px-6 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/gsi-logo.svg"
          alt="GSI"
          className="h-8 w-auto"
        />
        <span className="font-display text-base font-bold text-brand-text">
          AI Studio
        </span>
      </Link>

      {/* ── Main nav ───────────────────────────────────────────────────── */}
      <nav className="mt-2 flex flex-1 flex-col px-3">
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
                  'text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-primary/8 text-brand-primary font-semibold'
                    : 'text-brand-text-secondary hover:bg-gray-50 hover:text-brand-text',
                )}
              >
                {/* Active left indicator */}
                {active && (
                  <motion.span
                    layoutId="sidebar-indicator"
                    className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {/* Create+ expandable item */}
          <div>
            <button
              onClick={toggleCreate}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5',
                'text-sm font-medium transition-colors',
                isStudioActive
                  ? 'bg-brand-primary/8 text-brand-primary font-semibold'
                  : 'text-brand-text-secondary hover:bg-gray-50 hover:text-brand-text',
              )}
            >
              {isStudioActive && (
                <motion.span
                  layoutId="sidebar-indicator"
                  className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Palette className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 text-left">Create</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  createOpen && 'rotate-180',
                )}
              />
            </button>

            {/* Studio sub-items */}
            <AnimatePresence>
              {createOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="ml-5 mt-1 flex flex-col gap-0.5 border-l-2 border-gray-100 pl-3">
                    {STUDIO_ITEMS.map((studio) => {
                      const active = pathname === studio.href || pathname.startsWith(studio.href + '/');
                      return (
                        <Link
                          key={studio.href}
                          href={studio.href}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg px-2.5 py-2',
                            'text-sm transition-colors',
                            active
                              ? 'bg-brand-primary/8 font-semibold text-brand-primary'
                              : 'text-brand-text-secondary hover:bg-gray-50 hover:text-brand-text',
                          )}
                        >
                          <studio.icon className="h-[18px] w-[18px] shrink-0" />
                          {studio.label}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Spacer ─────────────────────────────────────────────────── */}
        <div className="flex-1" />

        {/* ── Bottom items (coming soon) ────────────────────────────── */}
        <div className="flex flex-col gap-0.5 pb-2">
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <span
                key={item.href}
                title="Coming soon"
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5',
                  'text-sm font-medium cursor-not-allowed opacity-50',
                  'text-brand-text-secondary',
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </span>
            );
          })}
        </div>

        {/* ── User / Active Kid ─────────────────────────────────────── */}
        <div className="border-t border-gray-100 px-1 py-4">
          {!authLoading && isAuthenticated && activeKid ? (
            /* Authenticated with active kid: avatar left, name + points stacked right */
            <button
              onClick={() => setShowPicker(true)}
              className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 transition hover:bg-gray-50"
              aria-label="Switch profile"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-xl">
                {getAvatarEmoji(activeKid.avatar)}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-brand-text leading-tight">
                  {activeKid.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-brand-primary">
                  <Sparkles className="h-3 w-3" />
                  <span>{totalPoints} AI Points</span>
                </p>
              </div>
            </button>
          ) : !authLoading && !isAuthenticated ? (
            /* Not authenticated: show sign in */
            <button
              onClick={() => setShowAuthFlow(true)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-primary transition hover:bg-brand-primary/8"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10">
                <UserRound className="h-[18px] w-[18px] text-brand-primary" />
              </div>
              <span>Sign In</span>
            </button>
          ) : (
            /* Loading */
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
              <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
            </div>
          )}
        </div>
      </nav>

      {/* Profile Picker overlay */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white"
          >
            <ProfilePicker
              onSelect={() => setShowPicker(false)}
              onClose={() => setShowPicker(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth flow modal */}
      <AnimatePresence>
        {showAuthFlow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAuthFlow(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white"
            >
              <PhoneAuthFlow
                onComplete={() => setShowAuthFlow(false)}
                onClose={() => setShowAuthFlow(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
