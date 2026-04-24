'use client';

import { useState } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import type { EmbedKind } from '@/lib/learn/cards';
import { SentimentDemo } from './SentimentDemo';

interface FoundationCardEmbedProps {
  embed: EmbedKind;
}

/**
 * Routes a Foundation card's `embed` descriptor to the right demo
 * component. HF Space iframes are gated behind a "load" button —
 * decision L4 says we ask the kid to tap before streaming model
 * assets, so a kid on a low-bandwidth connection doesn't pay the
 * download cost just for visiting the page.
 */
export function FoundationCardEmbed({ embed }: FoundationCardEmbedProps) {
  if (embed.type === 'explainer_only') {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <Info className="h-3 w-3" aria-hidden="true" />
          No demo yet
        </div>
        <p>
          This concept is better felt through the Kid CEO agents themselves. Head
          back to <a href="/ceo" className="underline">Kid CEO</a> and watch it
          show up in the next agent run.
        </p>
      </div>
    );
  }

  if (embed.type === 'transformers_js_demo') {
    if (embed.demoId === 'sentiment') {
      return <SentimentDemo />;
    }
    return <PlaceholderEmbed label={`Demo '${embed.demoId}' coming soon`} />;
  }

  if (embed.type === 'hf_space') {
    return <HfSpaceEmbed src={embed.src} height={embed.height} />;
  }

  // Exhaustiveness guard.
  const _never: never = embed;
  void _never;
  return null;
}

function HfSpaceEmbed({ src, height }: { src: string; height: number }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">
        This runs a live Hugging Face Space. Tap to load it — it streams a couple
        of MB from Hugging Face.
      </p>
      {!loaded ? (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Load demo
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <iframe
          src={src}
          title="Hugging Face Space demo"
          loading="lazy"
          height={height}
          className="w-full rounded-2xl border border-slate-200 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      )}
    </div>
  );
}

function PlaceholderEmbed({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}
