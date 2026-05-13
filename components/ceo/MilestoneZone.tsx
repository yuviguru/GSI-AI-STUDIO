'use client';

import { useEffect, useState } from 'react';
import { Clock, Trophy } from 'lucide-react';
import { EventCard } from './EventCard';
import { AgentEventCard } from './agents/AgentEventCard';
import { Mascot } from '@/components/mascot/Mascot';
import {
  DEFAULT_MILESTONE_HOUR_IST,
  DEFAULT_MILESTONE_MINUTE_IST,
  nextMilestoneAtIst,
} from '@/lib/ceo/cadence';
import type { CeoBusiness, CeoChoiceId, CeoEvent } from '@gsi/types';

interface MilestoneZoneProps {
  pendingMilestone: CeoEvent | null;
  business: CeoBusiness;
  onChoose: (choiceId: CeoChoiceId) => void;
  /** Called when an agent-driven milestone resolves so the parent can
   *  refresh pending pointers + cash. */
  onAgentResolved?: () => void;
  loading?: boolean;
}

/**
 * Top zone of the Phase 3 two-zone play surface.
 *
 * Renders the pending milestone event when one exists, or an "arrives at
 * 6:30 PM IST" countdown card when empty. Milestones are the day's anchor
 * so this zone always sits above the small-decisions zone regardless of
 * which is populated.
 *
 * Design: decision D1 locks the daily tick at 18:30 IST — copy here says
 * the exact time so kids learn to associate this moment with the daily
 * habit. IST explicit so kids outside India see where the schedule comes
 * from; platform is India-first for now.
 */
export function MilestoneZone({
  pendingMilestone,
  business,
  onChoose,
  onAgentResolved,
  loading = false,
}: MilestoneZoneProps) {
  const isAgentDriven = !!pendingMilestone?.agentWorkflowId;
  return (
    <section
      aria-labelledby="milestone-zone-heading"
      className="rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-amber-50 p-5 shadow-sm"
    >
      <header className="mb-3 flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700"
          aria-hidden="true"
        >
          <Trophy className="h-4 w-4" />
        </span>
        <h2
          id="milestone-zone-heading"
          className="font-display text-xs font-bold uppercase tracking-wider text-purple-700"
        >
          Today&apos;s Big Choice
        </h2>
      </header>

      {pendingMilestone ? (
        isAgentDriven ? (
          <AgentEventCard
            event={pendingMilestone}
            business={business}
            onResolved={() => onAgentResolved?.()}
          />
        ) : (
          <EventCard event={pendingMilestone} onChoose={onChoose} disabled={loading} />
        )
      ) : (
        <MilestoneCountdown />
      )}
    </section>
  );
}

function MilestoneCountdown() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const nextTick = nextMilestoneAtIst(now, DEFAULT_MILESTONE_HOUR_IST, DEFAULT_MILESTONE_MINUTE_IST);
  const msUntil = nextTick.getTime() - now.getTime();
  const hours = Math.max(0, Math.floor(msUntil / (60 * 60 * 1000)));
  const minutes = Math.max(0, Math.floor((msUntil % (60 * 60 * 1000)) / (60 * 1000)));

  return (
    <div
      className="flex items-center gap-4 rounded-2xl bg-white px-4 py-5 shadow-card"
      role="status"
      aria-live="polite"
    >
      <Mascot expression="thinking" size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold text-slate-800">
          Your next Big Choice arrives at <span className="whitespace-nowrap">6:30 PM IST</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span aria-label={`${hours} hours and ${minutes} minutes remaining`}>
            in {hours}h {minutes}m
          </span>
        </p>
      </div>
    </div>
  );
}
