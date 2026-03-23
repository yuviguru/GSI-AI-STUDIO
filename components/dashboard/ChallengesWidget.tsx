'use client';

import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';

const CHALLENGES = [
  {
    emoji: '🎓',
    title: 'Deep Focus',
    subtitle: 'Extra challenge',
    xp: 250,
    href: '/beat-the-ai',
    bg: 'bg-violet-100',
  },
  {
    emoji: '🎓',
    title: 'Day 5/30',
    subtitle: 'Daily challenge',
    xp: 200,
    gems: 5,
    href: '/create/story',
    bg: 'bg-orange-100',
  },
  {
    emoji: '🧪',
    title: 'Quiz Master',
    subtitle: 'Weekly challenge',
    xp: 180,
    href: '/create/quiz',
    bg: 'bg-cyan-100',
  },
  {
    emoji: '🎵',
    title: 'Beat Maker',
    subtitle: 'Music challenge',
    xp: 150,
    gems: 3,
    href: '/create/music',
    bg: 'bg-rose-100',
  },
];

export function ChallengesWidget() {
  return (
    <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-card">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5">
        <h3 className="font-display text-sm font-bold text-brand-text">Challenges</h3>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft font-mono text-[10px] font-bold text-brand-primary">
          {CHALLENGES.length}
        </span>
        <div className="flex-1" />
        <Link href="/beat-the-ai" className="text-xs font-semibold text-brand-text-secondary hover:text-brand-primary">
          View all &rsaquo;
        </Link>
      </div>

      {/* Scrollable challenge list */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {CHALLENGES.map((c) => (
          <Link key={c.title} href={c.href} className="block shrink-0">
            <div className="flex items-center gap-3 rounded-xl bg-brand-background p-3 transition-colors hover:bg-gray-100">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${c.bg}`}>
                {c.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-brand-text">{c.title}</p>
                <p className="text-[11px] text-brand-text-muted">{c.subtitle}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {c.gems != null && (
                  <span className="text-[11px] font-bold text-brand-ai">💎 +{c.gems}</span>
                )}
                <span className="text-[11px] font-bold text-brand-accent">🔥 +{c.xp}</span>
              </div>
              <button
                onClick={(e) => e.preventDefault()}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-gray-200"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-brand-text-muted" />
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
