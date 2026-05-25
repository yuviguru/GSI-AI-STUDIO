'use client';

import { useAiPoints } from '@/contexts/AiPointsContext';

interface StudioStreakCardProps {
  /** Studio creationType key in `perStudioStreaks` — e.g. `book`, `story`. */
  studio: string;
  /** Label shown on the card (e.g. "Book Streak", "Music Streak"). */
  label: string;
  /** Empty-state CTA when count is 0. */
  emptyMessage?: string;
}

/**
 * Per-studio daily writing/creating streak card. Shows the current streak
 * count with a flame icon; empty state nudges the kid to start one today.
 *
 * Reads from `perStudioStreaks[studio].count`. Server bumps the count when
 * a `track_creation` with `todayDate` lands for this studio.
 */
export function StudioStreakCard({
  studio,
  label,
  emptyMessage = 'Start a streak today!',
}: StudioStreakCardProps) {
  const { perStudioStreaks } = useAiPoints();
  const count = perStudioStreaks[studio]?.count ?? 0;

  return (
    <div className="game-hud-frame game-glass shrink-0 rounded-lg p-3 shadow-glass">
      <div className="mb-1 font-display text-[11px] font-bold uppercase tracking-wider">
        {label}
      </div>

      {count > 0 ? (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl">🔥</span>
          <span className="font-display text-2xl font-black text-brand-accent">
            {count}
          </span>
          <span className="text-[11px] text-brand-text-secondary">
            day{count === 1 ? '' : 's'} in a row
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-brand-text-secondary">
          <span className="text-base opacity-50">🔥</span>
          <span>{emptyMessage}</span>
        </div>
      )}
    </div>
  );
}
