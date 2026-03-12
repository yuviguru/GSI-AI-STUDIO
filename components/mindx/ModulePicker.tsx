'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MODULE_INFO } from '@/types/mindx.types';
import type { SkillArenaModule, SkillArenaModuleProgress } from '@/types/mindx.types';

interface ModulePickerProps {
  onSelect: (module: SkillArenaModule) => void;
  progress?: Record<SkillArenaModule, SkillArenaModuleProgress>;
}

const moduleCards: { module: SkillArenaModule; gradient: string; bg: string }[] = [
  { module: 'speaking', gradient: 'from-rose-400 to-pink-500', bg: 'bg-rose-50' },
  { module: 'listening', gradient: 'from-sky-400 to-blue-500', bg: 'bg-sky-50' },
  { module: 'thinking', gradient: 'from-violet-400 to-purple-500', bg: 'bg-violet-50' },
  { module: 'reading', gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50' },
];

const BAND_BADGES: Record<number, string> = {
  0: '',
  1: '🌱',
  2: '🔍',
  3: '⭐',
  4: '🏅',
  5: '👑',
};

export function ModulePicker({ onSelect, progress }: ModulePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {moduleCards.map(({ module, gradient, bg }, i) => {
        const info = MODULE_INFO[module];
        const modProgress = progress?.[module];
        const hasAttempted = modProgress && modProgress.assessments > 0;

        return (
          <motion.button
            key={module}
            onClick={() => onSelect(module)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4',
              'text-center shadow-sm transition-shadow hover:shadow-md',
              'ring-1 ring-transparent hover:ring-gray-200',
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl text-2xl',
                bg,
              )}
            >
              {info.icon}
            </div>

            <h3 className="font-display text-sm font-bold text-gray-900">
              {info.name}
            </h3>

            <p className="text-xs leading-snug text-gray-400">
              {info.description}
            </p>

            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>~{info.estimatedTime} min</span>
              {info.requiresMic && <span className="text-rose-400">| Mic</span>}
            </div>

            {hasAttempted ? (
              <div className="flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium">
                <span>{BAND_BADGES[modProgress.band] ?? '🌱'}</span>
                <span className="text-gray-600">{modProgress.bandTitle}</span>
              </div>
            ) : (
              <span className="rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white"
                style={{
                  backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
                }}
              >
                <span className={cn('bg-gradient-to-r bg-clip-text text-transparent', gradient)}>
                  New!
                </span>
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
