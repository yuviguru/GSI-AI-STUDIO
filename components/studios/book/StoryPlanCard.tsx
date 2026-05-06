'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { BookPlot } from '@/types/book.types';

interface StoryPlanCardProps {
  plot: BookPlot;
}

interface BeatRow {
  key: keyof BookPlot;
  emoji: string;
  label: string;
}

const BEAT_ROWS: BeatRow[] = [
  { key: 'idea', emoji: '💡', label: 'Big Idea' },
  { key: 'beginning', emoji: '🌟', label: 'Beginning' },
  { key: 'problem', emoji: '⚡', label: 'Problem' },
  { key: 'adventure', emoji: '🚀', label: 'Adventure' },
  { key: 'ending', emoji: '🎉', label: 'Ending' },
];

/**
 * Sidebar reference card showing the kid's story plan from the wizard's
 * "Plan your story" step. Lives in the editor's right panel so the kid can
 * see their plan while writing pages. Read-only — the plan was set in the
 * wizard and stays as inspiration, not editable here (keeps the editor
 * focused on writing pages).
 */
export function StoryPlanCard({ plot }: StoryPlanCardProps) {
  const [expanded, setExpanded] = useState(true);

  // Filter to non-empty beats so we don't show empty rows for skipped beats
  const filledBeats = BEAT_ROWS.filter((b) => plot[b.key].trim().length > 0);

  if (filledBeats.length === 0) return null;

  return (
    <div className="rounded-3xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-3 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={expanded}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white">
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-gray-900">Your story plan</div>
          <div className="text-[11px] text-gray-600">
            {filledBeats.length} of {BEAT_ROWS.length} parts written
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {filledBeats.map((beat) => (
            <div
              key={beat.key}
              className="rounded-xl bg-white/80 p-2.5 ring-1 ring-sky-100"
            >
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className="text-base">{beat.emoji}</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-sky-700">
                  {beat.label}
                </span>
              </div>
              <p className="text-xs leading-snug text-gray-800">{plot[beat.key]}</p>
            </div>
          ))}
          <p className="px-1 pt-1 text-[10px] italic text-gray-500">
            Tip: write each part on its own page — the plan keeps you on track.
          </p>
        </div>
      )}
    </div>
  );
}
