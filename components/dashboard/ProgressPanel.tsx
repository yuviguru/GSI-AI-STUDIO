'use client';

import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { useAiPoints } from '@/contexts/AiPointsContext';

/* ─── Bar chart data ───────────────────────────────────────────────────────── */

const CHART_BARS = [
  { month: 'Sep', pct: 45, color: 'bg-violet-400' },
  { month: 'Oct', pct: 65, color: 'bg-orange-400' },
  { month: 'Nov', pct: 35, color: 'bg-emerald-400' },
  { month: 'Dec', pct: 55, color: 'bg-blue-400' },
  { month: 'Jan', pct: 40, color: 'bg-amber-400' },
  { month: 'Feb', pct: 80, color: 'bg-rose-400' },
];

/* ─── Badge data ───────────────────────────────────────────────────────────── */

const BADGE_DISPLAY = [
  { emoji: '📖', label: 'Story\nExplorer' },
  { emoji: '❤️', label: 'Heart of\na Creator' },
  { emoji: '🌈', label: 'Rainbow\nStreak' },
  { emoji: '🔥', label: 'Creative\nPassion' },
];

/* ─── Challenge data ───────────────────────────────────────────────────────── */

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
];

/* ─── Bar chart component ──────────────────────────────────────────────────── */

function BarChart() {
  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-brand-text">Creative Streak</h3>
        <Link href="/creations" className="text-xs font-semibold text-brand-text-secondary hover:text-brand-primary">
          Learn more
        </Link>
      </div>

      <div className="mt-5 flex items-end gap-3" style={{ height: 120 }}>
        {CHART_BARS.map((bar) => (
          <div key={bar.month} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full overflow-hidden rounded-t-lg bg-gray-100" style={{ height: 100 }}>
              <div
                className={`w-full rounded-t-lg ${bar.color} transition-all duration-500`}
                style={{ height: `${bar.pct}%`, marginTop: `${100 - bar.pct}%` }}
              />
            </div>
            <span className="text-[11px] text-brand-text-muted">{bar.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main panel ───────────────────────────────────────────────────────────── */

export function ProgressPanel() {
  const { badges, creationsByType } = useAiPoints();
  const totalCreations = Object.values(creationsByType).reduce((s, n) => s + n, 0);
  const progressPct = Math.min(100, Math.round((totalCreations / 10) * 100));

  return (
    <div className="flex flex-col gap-5">

      {/* Today's Progress header */}
      <div className="rounded-xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-brand-text">Today&apos;s Progress</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-secondary">↑ 2.3%</span>
            <span className="font-mono text-2xl font-extrabold text-brand-text">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <BarChart />

      {/* Badges */}
      <div>
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

        <div className="mt-3 flex gap-3">
          {BADGE_DISPLAY.map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                {b.emoji}
              </div>
              <p className="text-center text-[10px] font-medium leading-tight text-brand-text-secondary whitespace-pre-line">
                {b.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Challenges */}
      <div>
        <div className="flex items-center gap-2.5">
          <h3 className="font-display text-sm font-bold text-brand-text">Challenges</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft font-mono text-[10px] font-bold text-brand-primary">
            {CHALLENGES.length}
          </span>
          <div className="flex-1" />
          <Link href="/beat-the-ai" className="text-xs font-semibold text-brand-text-secondary hover:text-brand-primary">
            View all &rsaquo;
          </Link>
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          {CHALLENGES.map((c) => (
            <Link key={c.title} href={c.href} className="block">
              <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${c.bg}`}>
                  {c.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-brand-text">{c.title}</p>
                  <p className="text-xs text-brand-text-muted">{c.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  {c.gems && (
                    <span className="flex items-center gap-0.5 text-xs font-bold text-brand-ai">
                      💎 +{c.gems}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-xs font-bold text-brand-accent">
                    🔥 +{c.xp}
                  </span>
                </div>
                <button
                  onClick={(e) => e.preventDefault()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <MoreHorizontal className="h-4 w-4 text-brand-text-muted" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
