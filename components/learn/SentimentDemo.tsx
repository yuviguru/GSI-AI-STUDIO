'use client';

import { useMemo, useState } from 'react';
import { Beaker, Smile, Meh, Frown } from 'lucide-react';

/**
 * Simple in-browser sentiment demo. Uses a lexicon-based scorer — not
 * a real Transformers.js model (yet). The teaching moment ("runs on
 * your device, costs ₹0") holds; follow-up story wires in a real
 * distilbert-base-uncased-finetuned-sst-2-english via @xenova/transformers
 * behind the L4 model-size gate.
 *
 * Deliberately NOT imported from a 5MB dep: keeps the initial bundle
 * small for kids on low-bandwidth connections, and the UX + contract
 * stays identical when we swap in the real model later.
 */

// Tiny, tuneable lexicon. Curated for kid-friendly examples — no
// slang, no edge cases. Real Transformers.js drop-in replaces this.
const LEXICON: Record<string, number> = {
  love: 2,
  great: 2,
  excellent: 3,
  amazing: 3,
  wonderful: 3,
  fun: 2,
  happy: 2,
  good: 1,
  nice: 1,
  best: 2,
  like: 1,
  awesome: 3,
  cool: 1,
  fantastic: 3,
  brilliant: 3,
  awful: -3,
  terrible: -3,
  bad: -2,
  hate: -3,
  worst: -3,
  boring: -2,
  slow: -1,
  broken: -2,
  sad: -2,
  angry: -2,
  disappointed: -2,
  annoying: -2,
  useless: -2,
  sour: -1,
  stale: -1,
};

const NEGATIONS = new Set(['not', 'no', "don't", "didn't", 'never']);

interface ScoreResult {
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  hits: Array<{ word: string; weight: number; negated: boolean }>;
}

function scoreSentiment(text: string): ScoreResult {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const hits: ScoreResult['hits'] = [];
  let total = 0;
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i]!;
    const weight = LEXICON[w];
    if (weight === undefined) continue;
    const prev = words[i - 1];
    const negated = !!prev && NEGATIONS.has(prev);
    const finalWeight = negated ? -weight : weight;
    total += finalWeight;
    hits.push({ word: w, weight: finalWeight, negated });
  }
  // Confidence scales with absolute score, capped at 0.95. When there
  // are no lexicon hits we return neutral with a low baseline.
  const abs = Math.abs(total);
  const confidence = hits.length === 0 ? 0.2 : Math.min(0.95, 0.5 + abs * 0.1);
  const label: ScoreResult['label'] = total > 0 ? 'positive' : total < 0 ? 'negative' : 'neutral';
  return { label, confidence, hits };
}

export function SentimentDemo() {
  const [text, setText] = useState('My lemonade stand is the best!');
  const result = useMemo(() => scoreSentiment(text), [text]);

  const Icon = result.label === 'positive' ? Smile : result.label === 'negative' ? Frown : Meh;
  const tint =
    result.label === 'positive'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : result.label === 'negative'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Beaker className="h-3 w-3" aria-hidden="true" />
        <span>
          Running on your device — the model never leaves your browser. ₹0 to you
          and to us.
        </span>
      </div>

      <label htmlFor="sentiment-input" className="sr-only">
        Text to analyse
      </label>
      <textarea
        id="sentiment-input"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:border-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        placeholder="Type something you heard from a customer…"
      />

      <div className={`rounded-2xl border p-4 ${tint}`} aria-live="polite">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" aria-hidden="true" />
          <p className="font-display text-base font-bold capitalize">{result.label}</p>
          <span className="ml-auto rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-semibold">
            {Math.round(result.confidence * 100)}% sure
          </span>
        </div>
        {result.hits.length > 0 ? (
          <p className="mt-2 text-xs opacity-80">
            Scored words:{' '}
            {result.hits.map((h, i) => (
              <span key={i} className="mx-0.5">
                <span className={h.weight > 0 ? 'underline' : 'line-through'}>{h.word}</span>
                {h.negated ? ' (negated)' : null}
                {i < result.hits.length - 1 ? ',' : ''}
              </span>
            ))}
          </p>
        ) : (
          <p className="mt-2 text-xs opacity-70">
            No scored words — try adding &ldquo;good&rdquo; or &ldquo;bad&rdquo;.
          </p>
        )}
      </div>

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold">How it works</summary>
        <p className="mt-1.5">
          This demo uses a tiny word list. Real sentiment models like
          DistilBERT-SST-2 look at whole-sentence context — they catch
          sarcasm, long negations, and tone in ways a word list can&apos;t.
          In the Customer Success Agent&apos;s workflow, a real
          Transformers.js model runs this step on your device too — no
          server round-trip.
        </p>
      </details>
    </div>
  );
}
