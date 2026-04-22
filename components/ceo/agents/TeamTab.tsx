'use client';

import { useState } from 'react';
import { Sparkles, Users } from 'lucide-react';
import { useCeoAgents } from '@/hooks/useCeoAgents';
import { AgentCard } from './AgentCard';
import type { CeoAgentConfig, CeoAgentId, CeoBusiness } from '@/types';

interface TeamTabProps {
  business: CeoBusiness;
  /** Called on successful hire so the parent can refresh its
   *  `business.currentCash` reflection. */
  onCashChanged?: () => void;
}

/**
 * Team tab — lists every agent in the catalog and shows hire status /
 * actions per agent. Gated on `business.phase !== 'pre_launch'` by the
 * parent (see `/ceo/play/page.tsx`) so the tab is earned by answering
 * the first milestone.
 */
export function TeamTab({ business, onCashChanged }: TeamTabProps) {
  const { catalog, hires, catalogLoading, hiresLoading, error, hireAgent } = useCeoAgents({
    businessId: business.id,
  });
  const [hireError, setHireError] = useState<string | null>(null);

  const hireByAgent = new Map(hires.map((h) => [h.agentId, h]));

  async function handleHire(agentId: CeoAgentId, config: CeoAgentConfig) {
    setHireError(null);
    try {
      await hireAgent({ businessId: business.id, agentId, config });
      onCashChanged?.();
    } catch (err) {
      setHireError(err instanceof Error ? err.message : 'Could not hire this agent.');
    }
  }

  if (catalogLoading || hiresLoading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" aria-hidden />
          ))}
        </div>
      </section>
    );
  }

  if (error || !catalog) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error ?? 'Could not load the Team.'}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="team-tab-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <header className="mb-4 flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"
          aria-hidden="true"
        >
          <Users className="h-4 w-4" />
        </span>
        <h2
          id="team-tab-heading"
          className="font-display text-xs font-bold uppercase tracking-wider text-indigo-700"
        >
          Your Team
        </h2>
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-500">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Hire agents to help run your business
        </span>
      </header>

      {hireError && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {hireError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {catalog.map((descriptor) => (
          <AgentCard
            key={descriptor.id}
            descriptor={descriptor}
            hire={hireByAgent.get(descriptor.id) ?? null}
            businessPhase={business.phase}
            onHire={(cfg) => handleHire(descriptor.id, cfg)}
          />
        ))}
      </div>
    </section>
  );
}
