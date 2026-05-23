'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/sounds';
import { MODE_GROUP_TABS, type ModeGroup } from './GameModes';

interface ModeGroupTabsProps {
  active: ModeGroup;
  onChange: (group: ModeGroup) => void;
  /** 'desktop' = roomier, 'mobile' = compact */
  variant?: 'desktop' | 'mobile';
}

/**
 * Segmented Create / Play / Learn switcher. Tapping a tab swaps which
 * modes are shown in the grid (the grid itself lives in the parent).
 */
export function ModeGroupTabs({ active, onChange, variant = 'desktop' }: ModeGroupTabsProps) {
  const compact = variant === 'mobile';

  return (
    <div
      className={cn(
        'game-glass inline-flex items-center gap-1 rounded-full',
        compact ? 'p-0.5' : 'p-1',
      )}
      role="tablist"
      aria-label="Mode groups"
    >
      {MODE_GROUP_TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (isActive) return;
              playSound('buttonTap');
              onChange(tab.key);
            }}
            className={cn(
              'relative rounded-full font-display font-bold transition-colors',
              compact ? 'px-3 py-1 text-[11px]' : 'px-4 py-1.5 text-xs',
              isActive ? 'text-white' : 'text-brand-text-secondary hover:text-brand-text',
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`mode-group-pill-${variant}`}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-primary to-brand-ai shadow-button"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              <span aria-hidden>{tab.emoji}</span>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
