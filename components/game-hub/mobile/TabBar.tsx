'use client';

import { Gamepad2, User, Award, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/sounds';

export type MobileTab = 'hub' | 'profile' | 'ranks' | 'quests';

interface TabBarProps {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
}

const TABS: Array<{ key: MobileTab; label: string; Icon: typeof Gamepad2 }> = [
  { key: 'hub',     label: 'Hub',     Icon: Gamepad2 },
  { key: 'profile', label: 'Profile', Icon: User },
  { key: 'ranks',   label: 'Ranks',   Icon: Award },
  { key: 'quests',  label: 'Quests',  Icon: Zap },
];

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="shrink-0 px-3 pb-3 safe-area-bottom">
      <div className="game-glass flex items-center justify-around rounded-lg p-1 shadow-lg">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.Icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (isActive) return;
                playSound('buttonTap');
                onChange(tab.key);
              }}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-all',
                isActive && 'bg-brand-primary/10',
              )}
              aria-label={tab.label}
              aria-pressed={isActive}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-transform',
                  isActive ? 'scale-110 text-brand-primary' : 'text-brand-text-secondary opacity-50',
                )}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
              <span
                className={cn(
                  'font-display text-[9px] font-bold',
                  isActive ? 'text-brand-primary' : 'text-brand-text-secondary',
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
