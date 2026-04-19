'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Mascot } from '@/components/mascot/Mascot';
import { cn } from '@/lib/utils';
import { EventCard } from './EventCard';
import type { CeoEvent, CeoChoiceId, CeoDimensionScores } from '@/types';

interface HistoryEntry {
  event: CeoEvent;
  decision: {
    choiceId: CeoChoiceId;
    choiceText: string;
    scores: Partial<CeoDimensionScores>;
    feedback: string;
    timestamp: string;
  };
}

interface EventFeedProps {
  activeEvent: CeoEvent | null;
  history: Array<HistoryEntry>;
  onChoose: (choiceId: CeoChoiceId) => void;
  loading?: boolean;
}

/** Empty-state hero shown when there is no active event and no history yet. */
function EmptyState() {
  return (
    <div className="rounded-2xl bg-white shadow-card p-8 flex flex-col items-center gap-3 text-center">
      <Mascot expression="thinking" size="md" />
      <p className="font-display text-base font-semibold text-slate-800">
        Your first decision is coming...
      </p>
      <p className="text-sm text-slate-500">Koko is lining up your first scenario.</p>
    </div>
  );
}

/** A single collapsible row in the decision history list. */
function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left min-h-[48px]"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
          {entry.decision.choiceId}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{entry.event.title}</p>
          <p className="truncate text-xs text-slate-500">You picked {entry.decision.choiceId}</p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-4 py-3 space-y-2">
              <p className="text-xs italic text-slate-500">
                &ldquo;{entry.decision.choiceText}&rdquo;
              </p>
              <p className="text-sm text-slate-700">{entry.decision.feedback}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Vertical feed: active event on top, decision history below. */
export function EventFeed({ activeEvent, history, onChoose, loading = false }: EventFeedProps) {
  const hasHistory = history.length > 0;

  return (
    <div className="space-y-5">
      {/* Active event */}
      {activeEvent ? (
        <EventCard event={activeEvent} onChoose={onChoose} disabled={loading} />
      ) : !hasHistory ? (
        <EmptyState />
      ) : (
        <div className="rounded-2xl bg-white shadow-card p-6 flex items-center gap-3">
          <Mascot expression="thinking" size="sm" />
          <p className="text-sm text-slate-600">
            {loading ? 'Cooking up your next event...' : 'Waiting for your next event.'}
          </p>
        </div>
      )}

      {/* Decision history */}
      {hasHistory && (
        <section className="space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-500 uppercase tracking-wide px-1">
            Decision history
          </h3>
          <div className="space-y-2">
            {[...history].reverse().map((entry, i) => (
              <HistoryRow key={`${entry.event.id}-${i}`} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
