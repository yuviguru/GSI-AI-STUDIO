'use client';

import Link from 'next/link';
import { LayoutGrid, BookOpen, Music, Gamepad2, Palette, HelpCircle } from 'lucide-react';

const CATEGORIES = [
  { label: 'Stories', icon: BookOpen, bg: 'bg-violet-100', text: 'text-violet-700', href: '/create/story' },
  { label: 'Music',   icon: Music,    bg: 'bg-orange-100', text: 'text-orange-700', href: '/create/music' },
  { label: 'Games',   icon: Gamepad2, bg: 'bg-cyan-100',   text: 'text-cyan-700',   href: '/create/game'  },
  { label: 'Comics',  icon: Palette,  bg: 'bg-amber-100',  text: 'text-amber-700',  href: '/create/comic' },
  { label: 'Quiz',    icon: HelpCircle, bg: 'bg-emerald-100', text: 'text-emerald-700', href: '/create/quiz' },
];

export function StudioSelectorPanel() {
  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
          <LayoutGrid className="h-5 w-5 text-violet-600" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-brand-text">Select Studio</h3>
          <p className="text-[11px] text-brand-text-secondary">Pick a creative studio to start</p>
        </div>
      </div>

      {/* Category pills — 8px radius, 24px gap */}
      <div className="mt-4 flex flex-wrap gap-6">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href}>
              <button
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${c.bg} ${c.text} hover:opacity-80`}
              >
                <Icon className="h-3.5 w-3.5" />
                {c.label}
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
