'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Music, HelpCircle, Gamepad2, Palette, Sparkles } from 'lucide-react';

const IN_PROGRESS_KEY = 'gsi_inprogress_creation';

interface InProgressCreation {
  type: 'story' | 'music' | 'quiz' | 'game' | 'comic';
  title: string;
  href: string;
  progress: number; // 0-100
}

const STUDIO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  story: BookOpen,
  music: Music,
  quiz: HelpCircle,
  game: Gamepad2,
  comic: Palette,
};

/**
 * Shows a "Continue Creating" CTA if the user has an in-progress creation.
 * NOTE: The write-side (saving in-progress state to localStorage) will be added
 * when studio pages persist draft state. Until then this card renders nothing.
 */
export function ContinueCreatingCard() {
  const [creation, setCreation] = useState<InProgressCreation | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(IN_PROGRESS_KEY);
      if (stored) setCreation(JSON.parse(stored) as InProgressCreation);
    } catch {
      // ignore malformed data
    }
  }, []);

  if (!creation) return null;

  const Icon = STUDIO_ICONS[creation.type] ?? Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link href={creation.href} className="group block">
        <div className="relative overflow-hidden rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100">
              <Icon className="h-5 w-5 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                Continue Creating
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
