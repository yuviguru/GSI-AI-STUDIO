'use client';

import { useAiPoints } from '@/contexts/AiPointsContext';

export function TodaysProgressCard() {
  const { creationsByType } = useAiPoints();
  const totalCreations = Object.values(creationsByType).reduce((s, n) => s + n, 0);
  const progressPct = Math.min(100, Math.round((totalCreations / 10) * 100));

  return (
    <div className="rounded-xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-brand-text">Today&apos;s Progress</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-secondary">↑ 2.3%</span>
          <span className="font-mono text-2xl font-extrabold text-brand-text">{progressPct}%</span>
        </div>
      </div>
    </div>
  );
}
