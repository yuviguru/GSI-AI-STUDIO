'use client';

import { useState } from 'react';
import { CheckCircle2, IndianRupee, Loader2, RefreshCw } from 'lucide-react';
import { WorkflowTrace } from './WorkflowTrace';
import type { CeoArtifact, CeoArtifactAsset } from '@/types';

interface TextArtifactReviewProps {
  artifact: CeoArtifact;
  costInr: number;
  rerollCostInr: number;
  title: string;
  acceptLabel: string;
  onAccept: () => Promise<void>;
  onReroll: () => Promise<void>;
  accent?: 'emerald' | 'sky' | 'amber';
  disabled?: boolean;
}

const ACCENTS = {
  emerald: 'from-emerald-500 to-teal-500 focus-visible:outline-emerald-600',
  sky: 'from-sky-500 to-indigo-500 focus-visible:outline-sky-600',
  amber: 'from-amber-500 to-orange-500 focus-visible:outline-amber-600',
} as const;

/**
 * Generic review UI for agent workflows whose output is text + schedule
 * tables + structured-data rows (Ops, Finance). The whole artifact
 * accepts as a package — there's no "pick 1 of 3" selection flow, so
 * the acceptLabel is the single-shot CTA.
 */
export function TextArtifactReview({
  artifact,
  costInr,
  rerollCostInr,
  title,
  acceptLabel,
  onAccept,
  onReroll,
  accent = 'emerald',
  disabled,
}: TextArtifactReviewProps) {
  const [accepting, setAccepting] = useState(false);
  const [rerolling, setRerolling] = useState(false);

  async function handleAccept() {
    if (accepting || rerolling || disabled) return;
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  }

  async function handleReroll() {
    if (rerolling || accepting || disabled) return;
    setRerolling(true);
    try {
      await onReroll();
    } finally {
      setRerolling(false);
    }
  }

  const accentClasses = ACCENTS[accent];

  return (
    <div className="space-y-4">
      <section aria-label={title}>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
        <div className="space-y-2">
          {artifact.assets.map((asset, idx) => (
            <AssetRow key={`${asset.type}-${idx}`} asset={asset} />
          ))}
          {artifact.assets.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              The agent didn&apos;t produce any output this run. Try again.
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={accepting || rerolling || disabled || artifact.assets.length === 0}
          aria-busy={accepting}
          className={`inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-r ${accentClasses} px-5 py-3 font-display text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {accepting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {acceptLabel}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleReroll}
          disabled={rerolling || accepting || disabled}
          aria-busy={rerolling}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {rerolling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Trying again…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again for ₹{rerollCostInr}
            </>
          )}
        </button>
      </div>

      <WorkflowTrace trace={artifact.trace} totalCostInr={costInr} />
    </div>
  );
}

function AssetRow({ asset }: { asset: CeoArtifactAsset }) {
  if (asset.type === 'text') {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {labelForTextKind(asset.kind)}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{asset.content}</p>
      </article>
    );
  }
  if (asset.type === 'schedule') {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Weekly schedule
        </p>
        <div className="divide-y divide-slate-100 text-sm">
          {asset.days.map((d, i) => (
            <div key={`${d.day}-${i}`} className="flex items-start gap-2 py-1">
              <span className="w-10 shrink-0 font-mono text-xs text-slate-500">{d.day}</span>
              <span className="w-24 shrink-0 font-mono text-xs text-slate-700">
                {d.open}–{d.close}
              </span>
              <span className="flex-1 text-slate-600">{d.notes}</span>
            </div>
          ))}
        </div>
      </article>
    );
  }
  if (asset.type === 'pricing_strategy') {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Pricing candidate
            </p>
            <p className="mt-1 flex items-center gap-1 font-display text-lg font-bold text-slate-800">
              <IndianRupee className="h-4 w-4" aria-hidden="true" />
              {asset.price}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            Break-even: {asset.breakEvenUnits}/day
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-700">{asset.rationale}</p>
      </article>
    );
  }
  if (asset.type === 'palette') {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Palette
        </p>
        <div className="mt-1.5 flex gap-2">
          {asset.colors.map((c, i) => (
            <span
              key={`${c}-${i}`}
              className="inline-flex h-6 w-12 items-center justify-center rounded-lg border border-slate-200 font-mono text-[10px]"
              style={{ backgroundColor: c }}
              title={c}
            >
              {c}
            </span>
          ))}
        </div>
      </article>
    );
  }
  // image assets fall back to a simple card — Ops + Finance don't use
  // images but we render anyway for safety.
  return null;
}

function labelForTextKind(kind: string): string {
  switch (kind) {
    case 'motto':
      return 'Motto';
    case 'voice':
      return 'Brand voice';
    case 'post':
      return 'Post';
    case 'checklist':
      return 'Checklist';
    case 'rationale':
      return 'Rationale';
    case 'hours_plan':
      return 'Hours plan';
    case 'role_card':
      return 'Role';
    default:
      return 'Note';
  }
}
