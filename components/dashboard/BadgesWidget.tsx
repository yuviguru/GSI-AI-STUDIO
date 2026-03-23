'use client';

import Link from 'next/link';
import { useAiPoints } from '@/contexts/AiPointsContext';

const BADGE_DISPLAY = [
  { emoji: '📖', label: 'Story\nExplorer' },
  { emoji: '❤️', label: 'Heart of\na Creator' },
  { emoji: '🌈', label: 'Rainbow\nStreak' },
  { emoji: '🔥', label: 'Creative\nPassion' },
];

export function BadgesWidget() {
  const { badges } = useAiPoints();

  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      <div className="flex items-center gap-2.5">
        <h3 className="font-display text-sm font-bold text-brand-text">Badges</h3>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft font-mono text-[10px] font-bold text-brand-primary">
          {badges.length || BADGE_DISPLAY.length}
        </span>
        <div className="flex-1" />
        <Link href="/creations" className="text-xs font-semibold text-brand-text-secondary hover:text-brand-primary">
          View all &rsaquo;
        </Link>
      </div>

      <div className="mt-4 flex gap-4">
        {BADGE_DISPLAY.map((b) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl">
              {b.emoji}
            </div>
            <p className="whitespace-pre-line text-center text-[10px] font-medium leading-tight text-brand-text-secondary">
              {b.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
