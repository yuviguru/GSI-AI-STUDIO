'use client';

import { useAiPoints } from '@/contexts/AiPointsContext';

export function QuickStatsRow() {
  const { totalPoints, creationsByType } = useAiPoints();
  const totalCreations = Object.values(creationsByType).reduce((s, n) => s + n, 0);

  const stats = [
    { label: 'Created', value: totalCreations, emoji: '🎨' },
    { label: 'XP Earned', value: totalPoints, emoji: '⭐' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map(({ label, value, emoji }) => (
        <div key={label} className="rounded-xl bg-white p-3 text-center shadow-card">
          <span className="text-lg">{emoji}</span>
          <p className="mt-1 font-mono text-xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      ))}
    </div>
  );
}
