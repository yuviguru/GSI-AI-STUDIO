'use client';

import { Wallet, Star, Smile, Flag } from 'lucide-react';
import { PHASE_LABELS } from '@/lib/ceo/constants';
import { PHASE_CONFIG } from '@/lib/ceo/phases';
import { cn } from '@/lib/utils';
import type { CeoBusiness } from '@/types';

const PHASE_TINT: Record<string, string> = {
  pre_launch: 'bg-slate-100 text-slate-700',
  launch: 'bg-indigo-100 text-indigo-700',
  early_growth: 'bg-teal-100 text-teal-700',
  scale: 'bg-orange-100 text-orange-700',
  mature: 'bg-purple-100 text-purple-700',
};

interface BusinessDashboardProps {
  business: CeoBusiness;
}

export function BusinessDashboard({ business }: BusinessDashboardProps) {
  const phaseMilestones = PHASE_CONFIG[business.phase]?.milestones ?? {};
  const total = Object.keys(phaseMilestones).length;
  const resolved = Object.keys(phaseMilestones).filter(
    (m) => business.phaseMilestones[m] === 'resolved',
  ).length;

  return (
    <div className="rounded-2xl bg-white shadow-card p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold font-display">{business.businessName}</h2>
          <p className="text-xs text-slate-500 capitalize">{business.businessType.replace('_', ' ')}</p>
        </div>
        <span
          className={cn(
            'text-xs font-medium px-3 py-1 rounded-full',
            PHASE_TINT[business.phase] ?? PHASE_TINT.pre_launch,
          )}
        >
          {PHASE_LABELS[business.phase]} · {resolved}/{total}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Wallet} label="Cash" value={`₹${business.currentCash.toLocaleString('en-IN')}`} tint="bg-orange-50 text-orange-700" />
        <Stat icon={Star} label="Reputation" value={`${business.reputation}/100`} tint="bg-indigo-50 text-indigo-700" />
        <Stat icon={Smile} label="Morale" value={`${business.morale}/100`} tint="bg-teal-50 text-teal-700" />
        <Stat icon={Flag} label="Decisions" value={String(business.totalDecisions)} tint="bg-purple-50 text-purple-700" />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className={cn('rounded-xl px-3 py-2 flex items-center gap-2', tint)}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}
