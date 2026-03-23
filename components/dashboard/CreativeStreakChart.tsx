'use client';

import Link from 'next/link';

const CHART_BARS = [
  { month: 'Sep', pct: 45, color: 'bg-violet-400' },
  { month: 'Oct', pct: 65, color: 'bg-orange-400' },
  { month: 'Nov', pct: 35, color: 'bg-emerald-400' },
  { month: 'Dec', pct: 55, color: 'bg-blue-400' },
  { month: 'Jan', pct: 40, color: 'bg-amber-400' },
  { month: 'Feb', pct: 80, color: 'bg-rose-400' },
];

export function CreativeStreakChart() {
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
