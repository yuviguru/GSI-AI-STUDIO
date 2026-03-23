'use client';

import Link from 'next/link';

const CATEGORIES = [
  { label: 'Stories', emoji: '📖', bg: 'bg-violet-100', text: 'text-violet-700', href: '/create/story' },
  { label: 'Music',   emoji: '🎵', bg: 'bg-orange-100', text: 'text-orange-700', href: '/create/music' },
  { label: 'Games',   emoji: '🎮', bg: 'bg-cyan-100',   text: 'text-cyan-700',   href: '/create/game'  },
  { label: 'Comics',  emoji: '🎨', bg: 'bg-amber-100',  text: 'text-amber-700',  href: '/create/comic' },
  { label: 'Quiz',    emoji: '❓', bg: 'bg-emerald-100', text: 'text-emerald-700', href: '/create/quiz' },
];

export function StudioSelectorPanel() {
  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xl">
          🎨
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-brand-text">Select Studio</h3>
          <p className="text-[11px] text-brand-text-secondary">Pick a creative studio to start</p>
        </div>
      </div>

      {/* Category pills — 8px radius, 24px gap */}
      <div className="mt-4 flex flex-wrap gap-6">
        {CATEGORIES.map((c) => (
          <Link key={c.label} href={c.href}>
            <button
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${c.bg} ${c.text} hover:opacity-80`}
            >
              <span className="text-sm">{c.emoji}</span>
              {c.label}
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}
