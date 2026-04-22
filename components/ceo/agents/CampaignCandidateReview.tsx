'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { WorkflowTrace } from './WorkflowTrace';
import type { CeoArtifact, CeoArtifactAsset } from '@/types';

interface CampaignCandidateReviewProps {
  artifact: CeoArtifact;
  costInr: number;
  rerollCostInr: number;
  onAccept: (selections: { poster: number; post: number }) => Promise<void>;
  onReroll: () => Promise<void>;
  disabled?: boolean;
}

/**
 * Campaign review — 3 posters + 2 caption variants. Mirrors the BRAND
 * review flow but tuned for Marketing outputs (landscape posters, short
 * + long caption).
 */
export function CampaignCandidateReview({
  artifact,
  costInr,
  rerollCostInr,
  onAccept,
  onReroll,
  disabled,
}: CampaignCandidateReviewProps) {
  const posters = useMemo(() => artifact.assets.filter(isPosterAsset), [artifact.assets]);
  const posts = useMemo(() => artifact.assets.filter(isPostAsset), [artifact.assets]);

  const [posterIdx, setPosterIdx] = useState(0);
  const [postIdx, setPostIdx] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [rerolling, setRerolling] = useState(false);

  const canAccept =
    posters.length > 0 && posts.length > 0 && !accepting && !rerolling && !disabled;

  async function handleAccept() {
    if (!canAccept) return;
    setAccepting(true);
    try {
      await onAccept({ poster: posterIdx, post: postIdx });
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
      {posters.length > 0 && (
        <section aria-labelledby="poster-options-heading">
          <h3
            id="poster-options-heading"
            className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Pick a poster
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {posters.map((poster, idx) => (
              <button
                key={poster.url}
                type="button"
                onClick={() => setPosterIdx(idx)}
                aria-pressed={posterIdx === idx}
                className={`group relative overflow-hidden rounded-2xl border-2 bg-white transition ${
                  posterIdx === idx
                    ? 'border-sky-500 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Image
                  src={poster.url}
                  alt={poster.altText}
                  width={poster.widthPx}
                  height={poster.heightPx}
                  className="aspect-video h-auto w-full object-cover"
                  unoptimized
                />
                {posterIdx === idx && (
                  <span className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white shadow-md">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section aria-labelledby="post-options-heading">
          <h3
            id="post-options-heading"
            className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Pick a caption
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {posts.map((post, idx) => (
              <button
                key={post.content + idx}
                type="button"
                onClick={() => setPostIdx(idx)}
                aria-pressed={postIdx === idx}
                className={`rounded-2xl border-2 bg-white p-3 text-left transition ${
                  postIdx === idx ? 'border-sky-500 shadow-md' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {idx === 0 ? 'Short' : 'Long'}
                </p>
                <p className="mt-1 text-sm text-slate-800">{post.content}</p>
              </button>
            ))}
          </div>
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
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Ship this campaign
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

type PosterAsset = CeoArtifactAsset & { type: 'image'; kind: 'poster' };
type PostAsset = CeoArtifactAsset & { type: 'text'; kind: 'post'; content: string };

function isPosterAsset(a: CeoArtifactAsset): a is PosterAsset {
  return a.type === 'image' && a.kind === 'poster';
}

function isPostAsset(a: CeoArtifactAsset): a is PostAsset {
  return a.type === 'text' && a.kind === 'post';
}
