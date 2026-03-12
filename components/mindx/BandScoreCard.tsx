'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BandScoreCardProps {
  band: number;
  bandTitle: string;
  score: number;
  label?: string;
  size?: 'sm' | 'lg';
  improved?: boolean;
}

const BAND_BADGES: Record<number, string> = {
  0: '🌱',
  1: '🌱',
  2: '🔍',
  3: '⭐',
  4: '🏅',
  5: '👑',
};

const BAND_COLORS: Record<number, string> = {
  0: 'from-gray-300 to-gray-400',
  1: 'from-green-400 to-emerald-500',
  2: 'from-sky-400 to-blue-500',
  3: 'from-amber-400 to-orange-500',
  4: 'from-violet-400 to-purple-500',
  5: 'from-yellow-400 to-amber-500',
};

export function BandScoreCard({
  band,
  bandTitle,
  score,
  label,
  size = 'sm',
  improved,
}: BandScoreCardProps) {
  const isLarge = size === 'lg';

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center gap-1 rounded-2xl border border-gray-100 bg-white p-3',
        isLarge && 'gap-2 p-5',
      )}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {label && (
        <span className="text-xs font-medium text-gray-400">{label}</span>
      )}

      <span className={cn('text-2xl', isLarge && 'text-4xl')}>
        {BAND_BADGES[band] ?? '🌱'}
      </span>

      <div
        className={cn(
          'rounded-full bg-gradient-to-r px-3 py-0.5 text-xs font-bold text-white',
          BAND_COLORS[band] ?? BAND_COLORS[0],
          isLarge && 'px-4 py-1 text-sm',
        )}
      >
        Band {band}
      </div>

      <span className={cn('text-xs font-semibold text-gray-700', isLarge && 'text-sm')}>
        {bandTitle}
      </span>

      <span className="text-xs text-gray-400">{score}/100</span>

      {improved && (
        <motion.span
          className="text-xs font-medium text-green-500"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Improved!
        </motion.span>
      )}
    </motion.div>
  );
}
