'use client';

import { cn } from '@/lib/utils';

export type GalleryTab = 'creations' | 'performances';

interface GalleryTabsProps {
  active: GalleryTab;
  onChange: (tab: GalleryTab) => void;
}

/**
 * Two-tab segmented control used by /creations and /explore.
 * Mirrors docs/ux-patterns.md#performances-tab.
 */
export function GalleryTabs({ active, onChange }: GalleryTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Gallery sections"
      className="inline-flex rounded-full bg-gray-100 p-1"
    >
      {([
        { key: 'creations', label: 'Creations', icon: '✨' },
        { key: 'performances', label: 'Performances', icon: '🎤' },
      ] as const).map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all',
            active === tab.key
              ? 'bg-white text-brand-purple shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <span aria-hidden>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
