'use client';

import { Settings } from 'lucide-react';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useCommunityStats } from '@/hooks/useCommunityStats';
import { AuthChip } from '@/components/navigation/AuthChip';
import { CreditsBadge } from '@/components/billing/CreditsBadge';

/**
 * Game Hub desktop header — brand, live-status pills, points, auth chip.
 *
 * The two center pills (online + streak) are now data-backed via
 * COMMUNITY-001 + the existing kid streak. Hub-home is always global
 * scope, so they read /api/community/stats?scope=global and the kid's
 * top-level streak.current. Inner-page scoped variants live in
 * GameNavBar.
 *
 * Auth/profile presentation is delegated to AuthChip so it stays
 * consistent with GameNavBar.
 */
export function TopHud() {
  const { totalPoints, isLoaded } = useAiPoints();
  const { activeKid } = useKidProfile();
  const stats = useCommunityStats('global');
  const onlineCount = stats?.onlineNow ?? null;
  const streakDays = activeKid?.streak?.current ?? 0;

  return (
    <header className="game-glass relative z-20 shrink-0 border-b border-white/40">
      <div className="mx-auto flex max-w-[1520px] items-center justify-between px-6 py-2.5 xl:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-primary to-brand-ai shadow-glass">
            <span className="text-sm">🎮</span>
          </div>
          <div className="font-display text-sm font-bold">
            GSI <span className="text-brand-primary">Studio</span>
          </div>
        </div>

        {/* Center status pills — live data. Online pill shows "—" while
            SWR settles so the layout doesn't jump on initial paint. Streak
            shows 0 days for first-time players (still scannable). */}
        <div className="hidden items-center gap-3 lg:flex">
          <div
            className="flex items-center gap-1.5 rounded-full bg-brand-secondary/10 px-2.5 py-1"
            title="Creators online on GSI right now"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-secondary opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-secondary"></span>
            </span>
            <span className="text-[11px] font-semibold text-brand-secondary">
              {onlineCount === null ? '—' : onlineCount.toLocaleString('en-IN')} online
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full bg-brand-accent/10 px-2.5 py-1"
            title="Your creation streak (days in a row)"
          >
            <span className="text-xs">🔥</span>
            <span className="font-mono text-[11px] font-bold text-brand-accent">
              {streakDays} {streakDays === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>

        {/* Right: credits + points + auth state + settings */}
        <div className="flex items-center gap-2">
          {/* AI Coins (currency) — hidden for anonymous flows */}
          <CreditsBadge />

          {/* AI Points (XP — lifetime, never spent) */}
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

          <button
            className="rounded-full p-1.5 transition hover:bg-white/60"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4 text-brand-text-secondary" />
          </button>
        </div>
      </div>
    </header>
  );
}
