'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useAuth } from '@/hooks/useAuth';
import { useBookList } from '@/hooks/useBookList';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useResolvedIdentity } from '@/hooks/useResolvedIdentity';
import { PlayerAvatar } from '../shared/PlayerAvatar';
import { XpBar } from '../shared/XpBar';

const XP_PER_LEVEL = 100;

function getTitle(level: number): string {
  if (level >= 50) return 'AI Master';
  if (level >= 30) return 'Story Wizard';
  if (level >= 15) return 'Creator Pro';
  if (level >= 5) return 'Rising Star';
  return 'Apprentice';
}

export function PlayerCard() {
  const { totalPoints, creationsByType, badges } = useAiPoints();
  const { isAuthenticated } = useAuth();
  const { activeKid } = useKidProfile();
  const { name, avatarUrl, mascotEmoji } = useResolvedIdentity({
    fallbackName: isAuthenticated ? 'Player' : 'Guest',
  });
  // Pull the kid's book list so the Bookshop chip can show a real count
  // of "X books in shop". SWR shares this fetch with any other PlayerCard
  // consumer on the page; cheap.
  const { items: bookList } = useBookList();

  const level = Math.floor(totalPoints / XP_PER_LEVEL) + 1;
  const xpInLevel = totalPoints % XP_PER_LEVEL;
  const xpNextLevel = level * XP_PER_LEVEL;
  const progressPct = (xpInLevel / XP_PER_LEVEL) * 100;
  const totalCreations = Object.values(creationsByType ?? {}).reduce((s, n) => s + (n ?? 0), 0);
  const title = getTitle(level);
  // Real kid streak from useKidProfile — replaces the previously
  // hardcoded "7🔥" placeholder. Falls back to 0 for guests / first-time.
  const streak = activeKid?.streak?.current ?? 0;
  // "Your books in the shop" — books the kid has both published AND
  // opted in to sell. Drives the bookshop chip's specific count.
  const booksInShop = bookList.filter(
    (b) => b.status === 'published' && b.sales?.enabled === true,
  ).length;

  return (
    <div className="game-hud-frame game-glass relative shrink-0 overflow-hidden rounded-lg p-4 shadow-glass">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-primary/15 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <div className="shrink-0">
          <PlayerAvatar
            avatarUrl={avatarUrl}
            emoji={mascotEmoji}
            name={name}
            level={level}
            size="md"
            progressPct={progressPct}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-bold leading-tight">{name}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-primary">{title}</div>
          <div className="mt-2">
            <XpBar percent={progressPct} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9px] text-brand-text-secondary">
            <span>{totalPoints.toLocaleString()} XP</span>
            <span>{xpNextLevel.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/60 pt-2.5">
        <div className="text-center">
          <div className="font-mono text-sm font-bold">{totalCreations}</div>
          <div className="text-[8px] font-semibold uppercase tracking-wider text-brand-text-secondary">Made</div>
        </div>
        <div className="text-center">
          {/* Real kid streak from useKidProfile — was previously hardcoded
              to '7🔥'. Shows the flame next to the number for visual
              consistency with the rest of the streak language. */}
          <div className="font-mono text-sm font-bold text-brand-accent">
            {streak}🔥
          </div>
          <div className="text-[8px] font-semibold uppercase tracking-wider text-brand-text-secondary">Streak</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-sm font-bold text-brand-secondary">{badges?.length ?? 0}</div>
          <div className="text-[8px] font-semibold uppercase tracking-wider text-brand-text-secondary">Badges</div>
        </div>
      </div>

      {/* Bookshop tie-in chip — identity-to-shop connection. Reads as
          "your work is out there" when the kid has listed books, becomes
          a friendly "Browse the Bookshop" invitation when they haven't.
          Sits at the bottom of the card so it doesn't compete with the
          stats row but is still glanceable from the hub. */}
      <Link
        href="/shop/books"
        className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 ring-1 ring-amber-200/60 transition-colors hover:from-amber-100 hover:to-orange-100"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="truncate text-[11px] font-semibold text-amber-900">
            {booksInShop > 0
              ? `${booksInShop} ${booksInShop === 1 ? 'book' : 'books'} in the shop`
              : 'Browse the Bookshop'}
          </span>
        </div>
        <ArrowRight className="h-3 w-3 shrink-0 text-amber-600" />
      </Link>
    </div>
  );
}
