'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MASCOTS, type Mascot, isMascotSelectable } from '@/lib/mascots/roster';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';

interface MascotPickerStepProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function MascotPickerStep({
  selectedId,
  onSelect,
  onNext,
  onBack,
}: MascotPickerStepProps) {
  const selected = MASCOTS.find((m) => m.id === selectedId) ?? null;
  // Sort unlocked mascots first so the picker doesn't show a wall of locked
  // tiles before the selectable one. Original roster order is preserved
  // within each group.
  const orderedMascots = [
    ...MASCOTS.filter((m) => !m.comingSoon),
    ...MASCOTS.filter((m) => m.comingSoon),
  ];

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">
          Step 1 of 4
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-gray-900">
          Pick your AI buddy
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          They&rsquo;ll cheer you on through every creation. More buddies are on the way!
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Choose your mascot"
        className="mt-5 grid flex-1 grid-cols-2 gap-3 overflow-y-auto pb-4 sm:grid-cols-4"
      >
        {orderedMascots.map((m: Mascot) => {
          const isSelected = selectedId === m.id;
          const selectable = isMascotSelectable(m);
          const ariaLabel = selectable
            ? `${m.name}, ${m.tagline}`
            : `${m.name}, ${m.tagline} (coming soon — locked)`;

          return (
            <motion.button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={ariaLabel}
              aria-disabled={!selectable}
              disabled={!selectable}
              onClick={() => selectable && onSelect(m.id)}
              whileTap={selectable ? { scale: 0.95 } : undefined}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br p-3 text-left transition-all',
                m.gradient,
                selectable && isSelected
                  ? cn('ring-4 ring-offset-2', m.ringColor)
                  : 'ring-1 ring-black/5',
                selectable
                  ? 'cursor-pointer hover:ring-black/15'
                  : 'cursor-not-allowed opacity-60 grayscale',
              )}
            >
              <MascotAvatar id={m.id} size="lg" />
              <div className="text-center">
                <p className="font-display text-sm font-bold text-gray-900">
                  {m.name}
                </p>
                <p className="text-[10px] font-medium text-gray-600">
                  {m.tagline}
                </p>
              </div>

              {!selectable && (
                <div className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-700 shadow-sm">
                  <Lock className="h-2.5 w-2.5" aria-hidden />
                  <span>Soon</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {selected && (
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-2xl bg-purple-50 p-3 text-center"
        >
          <p className="text-sm italic text-purple-900">
            &ldquo;{selected.greeting}&rdquo;
          </p>
        </motion.div>
      )}

      <div className="mt-4 flex gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-100"
          >
            ← Back
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!selected}
          className={cn(
            'flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
            selected
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'cursor-not-allowed bg-gray-300',
          )}
        >
          {selected ? `Stick with ${selected.name} →` : 'Pick a buddy first'}
        </button>
      </div>
    </div>
  );
}
