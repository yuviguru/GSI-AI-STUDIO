'use client';

import { PHASE_LABELS } from '@/lib/ceo/constants';
import { PHASES, PHASE_CONFIG } from '@/lib/ceo/phases';
import { cn } from '@/lib/utils';
import type { CeoPhaseKey, CeoMilestoneStatus } from '@/types';

interface PhaseProgressProps {
  currentPhase: CeoPhaseKey;
  phaseMilestones: Record<string, CeoMilestoneStatus>;
}

export function PhaseProgress({ currentPhase, phaseMilestones }: PhaseProgressProps) {
  const currentIndex = PHASES.indexOf(currentPhase);

  return (
    <div className="rounded-2xl bg-white shadow-card p-4">
      <div className="flex items-stretch gap-1.5">
        {PHASES.map((phase, i) => {
          const total = Object.keys(PHASE_CONFIG[phase].milestones).length;
          const resolved = Object.keys(PHASE_CONFIG[phase].milestones).filter(
            (m) => phaseMilestones[m] === 'resolved',
          ).length;
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          const fillPct = isPast ? 100 : isCurrent ? Math.round((resolved / total) * 100) : 0;

          return (
            <div key={phase} className="flex-1 min-w-0 flex flex-col gap-1">
              <div
                className={cn(
                  'h-2.5 rounded-full overflow-hidden',
                  isPast || isCurrent ? 'bg-indigo-100' : 'bg-slate-100',
                )}
              >
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <div
                className={cn(
                  'text-[10px] sm:text-xs text-center truncate',
                  isCurrent ? 'font-semibold text-indigo-700' : 'text-slate-500',
                )}
              >
                {PHASE_LABELS[phase]}
              </div>
              {isCurrent && (
                <div className="text-[10px] text-center text-slate-500">
                  {resolved}/{total}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
