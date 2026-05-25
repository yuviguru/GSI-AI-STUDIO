'use client';

import { Lock } from 'lucide-react';
import { BADGE_CATALOG, getBadgeProgressHint, type Badge } from '@/lib/badges';
import { useAiPoints } from '@/contexts/AiPointsContext';

interface StudioBadgeStripProps {
  /** Prefix that identifies badges scoped to this studio in `lib/badges.ts`
   *  (e.g. `book_` for the Book Studio). */
  idPrefix: string;
  /** Heading shown above the strip. */
  title: string;
  /** Optional emoji prepended to the heading. */
  emoji?: string;
}

/**
 * Compact strip of studio-scoped badges shown on a studio home page.
 *
 * Earned badges render in colour with their emoji; locked ones render as
 * a dimmed lock tile with a tooltip carrying the progress hint
 * ("Write 2 more days in a row"). The global badge gallery on the hub
 * still shows everything — this is a focused, contextual view.
 */
export function StudioBadgeStrip({ idPrefix, title, emoji }: StudioBadgeStripProps) {
  const { badges, creationsByType, conceptsLearned, totalPoints, perStudioStreaks } =
    useAiPoints();

  const studioBadges = BADGE_CATALOG.filter((b) => b.id.startsWith(idPrefix));
  const earned = new Set(badges);

  const pointsData = {
    aiPoints: totalPoints,
    badges,
    conceptsLearned,
    creationsByType,
    shareCount: 0,
    perStudioStreaks,
  };

  return (
    <div className="game-hud-frame game-glass shrink-0 rounded-lg p-3 shadow-glass">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-display text-[11px] font-bold uppercase tracking-wider">
          {emoji ? `${emoji} ` : ''}
          {title}
        </div>
        <span className="font-mono text-[10px] font-bold text-brand-text-secondary">
          {studioBadges.filter((b) => earned.has(b.id)).length}/{studioBadges.length}
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {studioBadges.map((badge) => (
          <BadgeTile
            key={badge.id}
            badge={badge}
            unlocked={earned.has(badge.id)}
            hint={!earned.has(badge.id) ? getBadgeProgressHint(badge, pointsData) : ''}
          />
        ))}
      </div>
    </div>
  );
}

function BadgeTile({
  badge,
  unlocked,
  hint,
}: {
  badge: Badge;
  unlocked: boolean;
  hint: string;
}) {
  if (unlocked) {
    return (
      <div
        title={`${badge.name} — ${badge.description}`}
        className="flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 p-1 text-base ring-1 ring-amber-200/60"
      >
        {badge.emoji}
      </div>
    );
  }

  return (
    <div
      title={hint || badge.description}
      className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 p-1 opacity-60 ring-1 ring-gray-200"
    >
      <Lock className="h-3 w-3 text-gray-400" />
    </div>
  );
}
