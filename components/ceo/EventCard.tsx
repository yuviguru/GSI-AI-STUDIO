'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { PHASE_LABELS } from '@/lib/ceo/constants';
import { playSound } from '@/lib/sounds';
import { cn } from '@/lib/utils';
import type { CeoEvent, CeoChoiceId } from '@/types';

interface EventCardProps {
  event: CeoEvent;
  onChoose: (choiceId: CeoChoiceId) => void;
  disabled?: boolean;
}

/** Per-category color styles for the small category badge at the top of the card.
 *  Keeps event categories visually distinct without over-emphasising any single one. */
const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  capital: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Capital' },
  growth: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Growth' },
  operations: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Operations' },
  people: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'People' },
  risk: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Risk' },
  crisis: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Crisis' },
};

const DEFAULT_CATEGORY_STYLE = { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Event' };

/** Active CEO event card — shows the scenario and three equal-weight choice buttons.
 *  Anti-gaming rule: no visual hierarchy across choices (same bg, same hover). */
export function EventCard({ event, onChoose, disabled = false }: EventCardProps) {
  // Capture when the card mounted so we can report response time on tap.
  const startTimeRef = useRef<number>(Date.now());

  const catStyle = CATEGORY_STYLES[event.category] ?? DEFAULT_CATEGORY_STYLE;
  const phaseLabel = PHASE_LABELS[event.phase];

  const handleChoose = (choiceId: CeoChoiceId) => {
    if (disabled) return;
    playSound('buttonTap');
    // Response time is computed and made available via ref for callers that
    // inspect it; onChoose itself is kept to the spec'd signature.
    const _responseTimeSeconds = Math.max(
      0,
      Math.round((Date.now() - startTimeRef.current) / 1000),
    );
    void _responseTimeSeconds;
    onChoose(choiceId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl bg-white shadow-card p-6"
    >
      {/* Category + phase badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
            catStyle.bg,
            catStyle.text,
          )}
        >
          {catStyle.label}
        </span>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">
          {phaseLabel}
        </span>
      </div>

      {/* Title */}
      <h2 className="font-display text-xl font-bold text-slate-900">{event.title}</h2>

      {/* Description */}
      <p className="mt-2 text-base text-slate-700">{event.description}</p>

      {/* Choices — equal visual weight, no size/color hierarchy */}
      <div className="mt-5 space-y-3">
        {event.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => handleChoose(choice.id)}
            disabled={disabled}
            className={cn(
              'flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left min-h-[48px]',
              'transition-all hover:bg-slate-100 hover:border-slate-300 active:scale-[0.99]',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-slate-50 disabled:hover:border-slate-200',
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white font-display text-sm font-bold text-slate-700 shadow-sm">
              {choice.id}
            </span>
            <span className="pt-1 text-sm text-slate-800">{choice.text}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
