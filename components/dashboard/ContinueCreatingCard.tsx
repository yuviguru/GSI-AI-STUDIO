'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const IN_PROGRESS_KEY = 'gsi_inprogress_creation';

interface InProgressCreation {
  type: 'story' | 'music' | 'quiz' | 'game' | 'comic';
  title: string;
  href: string;
  progress: number; // 0-100
}

const STUDIO_EMOJIS: Record<string, string> = {
  story: '📖',
  music: '🎵',
  quiz: '🎮',
  game: '🕹️',
  comic: '🎨',
};

export function ContinueCreatingCard() {
  const [creation, setCreation] = useState<InProgressCreation | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(IN_PROGRESS_KEY);
      if (stored) setCreation(JSON.parse(stored) as InProgressCreation);
    } catch {
      // ignore
    }
  }, []);

  if (!creation) return null;

  const emoji = STUDIO_EMOJIS[creation.type] ?? '✨';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link href={creation.href} className="group block">
        <div className="relative overflow-hidden rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-2xl">
              {emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                ⚡ Continue Creating
              </p>
              <p className="mt-0.5 truncate font-display text-sm font-bold text-gray-900">
                {creation.title}
              </p>
              {/* Progress bar */}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
                <div
                  className="h-full rounded-full bg-orange-400 transition-all"
                  style={{ width: `${creation.progress}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-orange-500 transition-transform group-hover:translate-x-1">
              Resume →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
