'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Settings } from 'lucide-react';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useCommunityStats } from '@/hooks/useCommunityStats';
import { MuteToggle } from '@/components/layout/MuteToggle';
import { CreditsBadge } from '@/components/billing/CreditsBadge';
import { scopeFromPath, scopeLabel } from '@/lib/social/scopeFromPath';
import { AuthChip } from './AuthChip';
import { cn } from '@/lib/utils';

/**
 * Game-styled app navigation bar for inner pages (studios, creations, etc.).
 * Mirrors the TopHud's visual language (game-glass, compact pills) and now
 * shows the same scope-aware online + streak pills:
 *   - /create/book → "12 in Books" + "7 days in Books"
 *   - /shop/books  → "12 in Books"
 *   - default      → "12 online" + "7 days"
 *
 * Layout: [Brand] [scoped pills] ─── spacer ─── [Points • Auth • Mute • Settings]
 *
 * Back-to-home actions live on individual pages (via BackLink), not here.
 */
export function GameNavBar() {
  const { totalPoints, isLoaded, perStudioStreaks } = useAiPoints();
  const { activeKid } = useKidProfile();
  const pathname = usePathname();
  const scope = scopeFromPath(pathname);
  const stats = useCommunityStats(scope);
  const onlineCount = stats?.onlineNow ?? null;
  // Scope-aware streak: home/unknown = kid's top-level streak.current
  // (mirrors TopHud); studio-scoped = the per-studio daily activity streak
  // maintained by sessionService when track_creation runs.
  const streakDays =
    scope === 'global'
      ? activeKid?.streak?.current ?? 0
      : perStudioStreaks[scope]?.count ?? 0;
  const label = scopeLabel(scope);
  const onBookshop = pathname?.startsWith('/shop/books') ?? false;

  return (
    <header
      className={cn(
        'game-glass sticky top-0 z-40',
        'border-b border-white/40',
      )}
    >
      <div className="mx-auto flex h-12 max-w-[1520px] items-center justify-between px-4 sm:px-6">
        {/* Brand — links to Game Hub */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-ai shadow-glass">
            <span className="text-sm">🎮</span>
          </div>
          <div className="hidden font-display text-sm font-bold sm:block">
            GSI <span className="text-brand-primary">Studio</span>
          </div>
        </Link>

        {/* Scope-aware status pills — mirrors TopHud's design language.
            Hidden on the narrowest screens (sm:flex) so they don't crowd
            the brand + right cluster on a phone. Online pill shows "—"
            while SWR settles; streak shows 0 for first-time kids. */}
        <div className="hidden items-center gap-2 sm:flex">
          <div
            className="flex items-center gap-1.5 rounded-full bg-brand-secondary/10 px-2 py-0.5"
            title={
              scope === 'global'
                ? 'Creators online on GSI right now'
                : `Creators in the ${label} studio right now`
            }
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-secondary opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-secondary"></span>
            </span>
            <span className="text-[11px] font-semibold text-brand-secondary">
              {onlineCount === null ? '—' : onlineCount.toLocaleString('en-IN')}
              {scope === 'global' ? ' online' : ` in ${label}`}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full bg-brand-accent/10 px-2 py-0.5"
            title={
              scope === 'global'
                ? 'Your overall creation streak'
                : `Your ${label} streak`
            }
          >
            <span className="text-xs">🔥</span>
            <span className="font-mono text-[11px] font-bold text-brand-accent">
              {streakDays} {streakDays === 1 ? 'day' : 'days'}
              {scope === 'global' ? '' : ` in ${label}`}
            </span>
          </div>
        </div>

        {/* Right: credits + points + auth + mute + settings */}
        <div className="flex items-center gap-2">
          {/* AI Coins (currency) — hidden for anonymous flows */}
          <CreditsBadge />

          {/* AI Points pill (XP — earned, never spent) */}
          <div
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-2.5 py-1 ring-1 ring-amber-300/40"
            title="AI Points — your lifetime creator score"
          >
            <span className="text-xs">✨</span>
            <span className="font-mono text-xs font-bold text-amber-700">
              {isLoaded ? totalPoints.toLocaleString() : '—'}
            </span>
          </div>

          <AuthChip />

          <MuteToggle />

          {/* Bookshop entry — primary destination on every inner page.
              Responsive per user direction: label visible at ≥sm, icon-only
              on small phones to save space. Highlights with amber ring when
              the kid is on /shop/books for active-route feedback. */}
          <Link
            href="/shop/books"
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors',
              onBookshop
                ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                : 'text-brand-text-secondary hover:bg-amber-50 hover:text-amber-700',
            )}
            title="Bookshop — books written by kids"
            aria-label="Bookshop"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden text-[11px] font-semibold sm:inline">
              Bookshop
            </span>
          </Link>

          <Link
            href="/settings"
            className="rounded-full p-1.5 transition hover:bg-white/60"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4 text-brand-text-secondary" />
          </Link>
        </div>
      </div>
    </header>
  );
}
