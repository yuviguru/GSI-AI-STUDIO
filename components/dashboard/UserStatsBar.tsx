'use client';

import { useAiPoints } from '@/contexts/AiPointsContext';

const AVATAR_EMOJIS = ['🧑', '👧', '👦', '🧒'];

export function UserStatsBar() {
  const { totalPoints, badges, creationsByType } = useAiPoints();
  const totalCreations = Object.values(creationsByType).reduce((s, n) => s + n, 0);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card">
      {/* Avatar stack */}
      <div className="flex shrink-0 -space-x-2">
        {AVATAR_EMOJIS.map((emoji, i) => (
          <div
            key={i}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm ring-2 ring-white"
          >
            {emoji}
          </div>
        ))}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple/10 text-[10px] font-bold text-brand-purple ring-2 ring-white">
          AI
        </div>
      </div>

      <div className="flex flex-1 items-center justify-around">
        {[
          { label: 'Creations', value: totalCreations },
          { label: 'AI Points', value: totalPoints },
          { label: 'Badges', value: badges.length },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="font-mono text-sm font-bold text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-400">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
