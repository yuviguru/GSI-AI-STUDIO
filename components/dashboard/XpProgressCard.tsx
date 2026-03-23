'use client';

import { motion } from 'framer-motion';
import { useAiPoints } from '@/contexts/AiPointsContext';

const LEVELS = [
  { name: 'Curious Explorer', min: 0, max: 99 },
  { name: 'Knowledge Seeker', min: 100, max: 249 },
  { name: 'Rising Star', min: 250, max: 499 },
  { name: 'Wisdom Warrior', min: 500, max: 999 },
  { name: 'Master Scholar', min: 1000, max: Infinity },
];

function getLevel(points: number) {
  const idx = Math.max(0, LEVELS.findIndex((l) => points >= l.min && points <= l.max));
  const level = LEVELS[idx] ?? LEVELS[LEVELS.length - 1]!;
  const levelNum = idx + 1;
  const next = LEVELS[idx + 1];
  const progress = next
    ? ((points - level.min) / (next.min - level.min)) * 100
    : 100;
  const toNext = next ? next.min - points : 0;
  return { levelNum, name: level.name, progress: Math.min(100, progress), toNext };
}

export function XpProgressCard() {
  const { totalPoints } = useAiPoints();
  const { levelNum, name, progress, toNext } = getLevel(totalPoints);

  return (
    <div className="rounded-xl bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⭐</span>
          <span className="font-mono text-2xl font-bold text-gray-900">{totalPoints}</span>
          <span className="text-xs font-medium text-gray-400">XP</span>
        </div>
        <span className="rounded-full bg-brand-purple/10 px-2.5 py-1 text-xs font-bold text-brand-purple">
          Lvl {levelNum}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-ai"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600">{name}</p>
        {toNext > 0 && (
          <p className="font-mono text-xs text-gray-400">+{toNext} to next</p>
        )}
      </div>
    </div>
  );
}
