'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { WorkflowTrace } from './WorkflowTrace';
import type { CeoArtifact, CeoArtifactAsset } from '@gsi/types';

interface BrandCandidateReviewProps {
  artifact: CeoArtifact;
  /** Cost to generate THIS artifact (already deducted). Shown in the trace. */
  costInr: number;
  /** Cost to re-roll — predicted based on next run index. */
  rerollCostInr: number;
  onAccept: (selections: { logo: number; motto: number }) => Promise<void>;
  onReroll: () => Promise<void>;
  disabled?: boolean;
}

/**
 * Candidate review for the BRAND workflow output. Kid sees 3 logos in a
 * grid + 3 motto text cards. Picks one of each, then taps Accept. The
 * "Try again" button triggers a re-roll at the escalated cost.
 */
export function BrandCandidateReview({
  artifact,
  costInr,
  rerollCostInr,
  onAccept,
  onReroll,
  disabled,
}: BrandCandidateReviewProps) {
  const logos = useMemo(
    () => artifact.assets.filter(isLogoAsset),
    [artifact.assets],
  );
  const mottos = useMemo(
    () => artifact.assets.filter(isMottoAsset),
    [artifact.assets],
  );
  const voice = useMemo(
    () => artifact.assets.find((a) => a.type === 'text' && a.kind === 'voice'),
    [artifact.assets],
  );

  const [logoIdx, setLogoIdx] = useState<number>(0);
  const [mottoIdx, setMottoIdx] = useState<number>(0);
  const [accepting, setAccepting] = useState(false);
  const [rerolling, setRerolling] = useState(false);

  const canAccept = logos.length > 0 && mottos.length > 0 && !accepting && !rerolling && !disabled;

  async function handleAccept() {
    if (!canAccept) return;
    setAccepting(true);
    try {
      await onAccept({ logo: logoIdx, motto: mottoIdx });
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

  return (
    <div className="space-y-4">
      {logos.length > 0 && (
        <section aria-labelledby="logo-options-heading">
          <h3
            id="logo-options-heading"
            className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Pick a logo
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {logos.map((logo, idx) => (
              <button
                key={logo.url}
                type="button"
                onClick={() => setLogoIdx(idx)}
                aria-pressed={logoIdx === idx}
                className={`group relative overflow-hidden rounded-2xl border-2 bg-white transition ${
                  logoIdx === idx
                    ? 'border-purple-500 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Image
                  src={logo.url}
                  alt={logo.altText}
                  width={logo.widthPx}
                  height={logo.heightPx}
                  className="aspect-square h-auto w-full object-cover"
                  unoptimized
                />
                {logoIdx === idx && (
                  <span className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white shadow-md">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {mottos.length > 0 && (
        <section aria-labelledby="motto-options-heading">
          <h3
            id="motto-options-heading"
            className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Pick a motto
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {mottos.map((motto, idx) => (
              <button
                key={motto.content + idx}
                type="button"
                onClick={() => setMottoIdx(idx)}
                aria-pressed={mottoIdx === idx}
                className={`rounded-2xl border-2 bg-white p-3 text-left transition ${
                  mottoIdx === idx
                    ? 'border-purple-500 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="font-display text-sm font-semibold text-slate-800">
                  “{motto.content}”
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {voice && voice.type === 'text' && (
        <section aria-labelledby="voice-heading" className="rounded-2xl bg-slate-50 p-3">
          <h3
            id="voice-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
          >
            Your brand voice
          </h3>
          <p className="mt-1 text-sm text-slate-700">{voice.content}</p>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={!canAccept}
          aria-busy={accepting}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 font-display text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {accepting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Use these
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
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Designing…
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

type LogoAsset = CeoArtifactAsset & { type: 'image' };
type MottoAsset = CeoArtifactAsset & { type: 'text'; kind: 'motto'; content: string };

function isLogoAsset(a: CeoArtifactAsset): a is LogoAsset {
  return a.type === 'image' && a.kind === 'logo';
}

function isMottoAsset(a: CeoArtifactAsset): a is MottoAsset {
  return a.type === 'text' && a.kind === 'motto';
}
