'use client';

import { Lock } from 'lucide-react';

// Placeholder badge data — replace with real catalog when icons are revisited.
const RECENT_BADGES = [
  { emoji: '📖', bg: 'from-amber-100 to-amber-50', ring: 'ring-amber-200/60', title: 'Story Master' },
  { emoji: '🎵', bg: 'from-rose-100 to-pink-50', ring: 'ring-rose-200/60', title: 'Music Maker' },
  { emoji: '🧠', bg: 'from-emerald-100 to-emerald-50', ring: 'ring-emerald-200/60', title: 'Quiz Champ' },
  { emoji: '🔥', bg: 'from-violet-100 to-violet-50', ring: 'ring-violet-200/60', title: '7-Day Streak' },
];

export function BadgesCard() {
  return (
    <div className="game-hud-frame game-glass shrink-0 rounded-lg p-3 shadow-glass">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-display text-[11px] font-bold uppercase tracking-wider">🏆 Badges</div>
        <button className="text-[10px] font-semibold text-brand-primary hover:underline">All →</button>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {RECENT_BADGES.map((b, i) => (
          <div
            key={i}
            title={b.title}
            className={`flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br ${b.bg} p-1 text-base ring-1 ${b.ring}`}
          >
            {b.emoji}
          </div>
        ))}
        {/* Locked slots */}
        <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 p-1 opacity-50 ring-1 ring-gray-200">
          <Lock className="h-3 w-3 text-gray-400" />
        </div>
        <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 p-1 opacity-50 ring-1 ring-gray-200">
          <Lock className="h-3 w-3 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
