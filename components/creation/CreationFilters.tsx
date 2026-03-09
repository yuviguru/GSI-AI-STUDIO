'use client';

import { cn } from '@/lib/utils';
import type { CreationType } from '@/types/creation.types';

interface CreationFiltersProps {
  active: CreationType | null;
  onFilterChange: (type: CreationType | null) => void;
}

const filters: Array<{ label: string; value: CreationType | null; emoji: string }> = [
  { label: 'All', value: null, emoji: '✨' },
  { label: 'Stories', value: 'story', emoji: '📖' },
  { label: 'Music', value: 'music', emoji: '🎵' },
  { label: 'Quizzes', value: 'quiz', emoji: '🧠' },
  { label: 'Comics', value: 'comic', emoji: '🎨' },
  { label: 'Games', value: 'game', emoji: '🎮' },
];

export function CreationFilters({ active, onFilterChange }: CreationFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {filters.map((filter) => {
        const isActive = active === filter.value;
        return (
          <button
            key={filter.label}
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95',
              isActive
                ? 'border-brand-purple bg-brand-purple text-white shadow-sm'
                : 'border-gray-200 bg-gray-100 text-gray-600 hover:border-brand-purple/40'
            )}
          >
            <span>{filter.emoji}</span>
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
