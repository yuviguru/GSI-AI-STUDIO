'use client';

import { useState } from 'react';
import { ListChecks, Moon, Plus } from 'lucide-react';
import { EventCard } from './EventCard';
import type { CeoChoiceId, CeoEvent } from '@gsi/types';

interface SmallDecisionsZoneProps {
  pendingRegular: CeoEvent | null;
  /** Count of regulars already decided today (IST). 0-5. */
  regularEventsToday: number;
  regularEventsCap: number;
  onChoose: (choiceId: CeoChoiceId) => void;
  /** Kid tapped "Take a small decision" — request the server to mint one. */
  onPull: () => Promise<void>;
  decideLoading?: boolean;
}

/**
 * Bottom zone of the Phase 3 two-zone play surface.
 *
 * Three states, per Daily Rhythm D4:
 *   - pending regular → render it (same card as a milestone, no special
 *                       framing — they look identical to the kid)
 *   - no pending, slots left → "Take a small decision" CTA + counter
 *   - no pending, cap hit   → "All 5 done — resets at midnight IST"
 */
export function SmallDecisionsZone({
  pendingRegular,
  regularEventsToday,
  regularEventsCap,
  onChoose,
  onPull,
  decideLoading = false,
}: SmallDecisionsZoneProps) {
  const slotsLeft = Math.max(0, regularEventsCap - regularEventsToday);
  const atCap = slotsLeft === 0;

  return (
    <section
      aria-labelledby="small-decisions-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700"
            aria-hidden="true"
          >
            <ListChecks className="h-4 w-4" />
          </span>
          <h2
            id="small-decisions-heading"
            className="font-display text-xs font-bold uppercase tracking-wider text-sky-700"
          >
            Small decisions
          </h2>
        </div>
        <span
          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
          aria-label={`${regularEventsToday} of ${regularEventsCap} small decisions used today`}
        >
          {regularEventsToday} / {regularEventsCap} used today
        </span>
      </header>

      {pendingRegular ? (
        <EventCard event={pendingRegular} onChoose={onChoose} disabled={decideLoading} />
      ) : atCap ? (
        <CapReachedCard />
      ) : (
        <PullCtaCard slotsLeft={slotsLeft} cap={regularEventsCap} onPull={onPull} />
      )}
    </section>
  );
}

function PullCtaCard({
  slotsLeft,
  cap,
  onPull,
}: {
  slotsLeft: number;
  cap: number;
  onPull: () => Promise<void>;
}) {
  const [pulling, setPulling] = useState(false);

  async function handleClick() {
    if (pulling) return;
    setPulling(true);
    try {
      await onPull();
    } finally {
      setPulling(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50 px-4 py-6 text-center">
      <p className="text-sm text-slate-600">
        Feel like making a quick call? You have <strong>{slotsLeft}</strong> of{' '}
        <strong>{cap}</strong> small decisions left today.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={pulling}
        className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 font-display text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-wait disabled:opacity-60"
        aria-busy={pulling}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {pulling ? 'Cooking up your decision…' : 'Take a small decision'}
      </button>
    </div>
  );
}

function CapReachedCard() {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-5"
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"
        aria-hidden="true"
      >
        <Moon className="h-4 w-4" />
      </span>
      <div>
        <p className="font-display text-sm font-semibold text-slate-800">
          All 5 small decisions done for today!
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Resets at midnight IST. Your next Big Choice arrives tomorrow at 6:30 PM IST.
        </p>
      </div>
    </div>
  );
}
