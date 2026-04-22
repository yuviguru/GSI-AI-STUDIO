'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, UserPlus, Users } from 'lucide-react';
import { PHASE_LABELS } from '@/lib/ceo/constants';
import type { CeoAgentConfig, CeoAgentDescriptor, CeoAgentHire, CeoPhaseKey } from '@/types';

interface AgentCardProps {
  descriptor: CeoAgentDescriptor;
  hire: CeoAgentHire | null;
  businessPhase: CeoPhaseKey;
  onHire: (config: CeoAgentConfig) => Promise<void>;
  disabled?: boolean;
}

const PHASE_ORDER: readonly CeoPhaseKey[] = [
  'pre_launch',
  'launch',
  'early_growth',
  'scale',
  'mature',
];

function phaseReached(current: CeoPhaseKey, required: CeoPhaseKey): boolean {
  return PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(required);
}

/**
 * A single-agent card used in the Team tab. Three visual states:
 *   1. Already hired — shows focus / aggressiveness config, action menu.
 *   2. Hireable — shows "Hire for ₹X/day" CTA.
 *   3. Locked — shows the unlock phase and a `Lock` icon.
 *
 * The hire form is inline (no modal) so kids can scan and commit quickly.
 */
export function AgentCard({ descriptor, hire, businessPhase, onHire, disabled }: AgentCardProps) {
  const unlocked = phaseReached(businessPhase, descriptor.unlockPhase);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focus, setFocus] = useState<string>(descriptor.focusOptions[0]?.id ?? 'balanced');
  const [aggressiveness, setAggressiveness] =
    useState<CeoAgentConfig['aggressiveness']>('medium');

  async function handleHire() {
    setSubmitting(true);
    try {
      await onHire({ focus, aggressiveness });
    } finally {
      setSubmitting(false);
      setExpanded(false);
    }
  }

  return (
    <article
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-label={`${descriptor.name} card`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            {descriptor.emoji}
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-slate-800">
              {descriptor.name}
            </h3>
            <p className="text-xs text-slate-500">{descriptor.tagline}</p>
          </div>
        </div>
        {hire ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <Users className="h-3 w-3" aria-hidden="true" />
            On your team
          </span>
        ) : unlocked ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            ₹{descriptor.salaryPerDay}/day
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
            title={`Unlocks at ${PHASE_LABELS[descriptor.unlockPhase]}`}
          >
            <Lock className="h-3 w-3" aria-hidden="true" />
            Phase lock
          </span>
        )}
      </header>

      {hire ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>
            <dt className="font-semibold text-slate-500 uppercase tracking-wider">Focus</dt>
            <dd>{focusLabel(descriptor, hire.config.focus)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500 uppercase tracking-wider">Aggressiveness</dt>
            <dd className="capitalize">{hire.config.aggressiveness}</dd>
          </div>
        </dl>
      ) : unlocked ? (
        <>
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              disabled={disabled}
              className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Hire for ₹{descriptor.salaryPerDay}/day
            </button>
          ) : (
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void handleHire();
              }}
            >
              <fieldset>
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Focus
                </legend>
                <div className="flex flex-wrap gap-2">
                  {descriptor.focusOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                        focus === opt.id
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`focus-${descriptor.id}`}
                        value={opt.id}
                        checked={focus === opt.id}
                        onChange={() => setFocus(opt.id)}
                        className="sr-only"
                      />
                      {opt.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Aggressiveness
                </legend>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((a) => (
                    <label
                      key={a}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium capitalize ${
                        aggressiveness === a
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`aggr-${descriptor.id}`}
                        value={a}
                        checked={aggressiveness === a}
                        onChange={() => setAggressiveness(a)}
                        className="sr-only"
                      />
                      {a}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                  aria-busy={submitting}
                >
                  {submitting ? 'Hiring…' : `Confirm — ₹${descriptor.salaryPerDay}/day`}
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  disabled={submitting}
                  className="text-xs text-slate-500 underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        <p className="mt-3 text-xs text-amber-700">
          Unlocks at <strong>{PHASE_LABELS[descriptor.unlockPhase]}</strong>.
        </p>
      )}

      {/* Expand toggle for hired state — details / dismiss / reconfigure.
          Deferred to a later story; button present so the UI shape is
          finalised. */}
      {hire ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
              Show details
            </>
          )}
        </button>
      ) : null}
    </article>
  );
}

function focusLabel(descriptor: CeoAgentDescriptor, focusId: string): string {
  return descriptor.focusOptions.find((f) => f.id === focusId)?.name ?? focusId;
}
