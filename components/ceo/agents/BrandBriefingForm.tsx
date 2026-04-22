'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

export type BrandMood =
  | 'playful'
  | 'serious'
  | 'bold'
  | 'dreamy'
  | 'mysterious'
  | 'warm'
  | 'clean'
  | 'retro'
  | 'energetic';

export type BrandAudience = 'kids_my_age' | 'family' | 'neighbours' | 'school';

export interface BrandBriefValue {
  mood: BrandMood;
  audience: BrandAudience;
  oneWord: string;
}

interface BrandBriefingFormProps {
  onSubmit: (brief: BrandBriefValue) => Promise<void>;
  disabled?: boolean;
  /** Shown next to the submit button — e.g. "₹34" for the first run. */
  predictedCostInr?: number;
  /** Helper copy shown under the submit button. */
  helperText?: string;
}

const MOODS: Array<{ id: BrandMood; label: string; emoji: string }> = [
  { id: 'playful', label: 'Playful', emoji: '🎈' },
  { id: 'serious', label: 'Serious', emoji: '📘' },
  { id: 'bold', label: 'Bold', emoji: '💥' },
  { id: 'dreamy', label: 'Dreamy', emoji: '☁️' },
  { id: 'mysterious', label: 'Mysterious', emoji: '🔮' },
  { id: 'warm', label: 'Warm', emoji: '☕' },
  { id: 'clean', label: 'Clean', emoji: '✨' },
  { id: 'retro', label: 'Retro', emoji: '📼' },
  { id: 'energetic', label: 'Energetic', emoji: '⚡' },
];

const AUDIENCES: Array<{ id: BrandAudience; label: string }> = [
  { id: 'kids_my_age', label: 'Kids my age' },
  { id: 'family', label: 'Families' },
  { id: 'neighbours', label: 'My neighbourhood' },
  { id: 'school', label: 'My school' },
];

const ONE_WORD_MAX = 20;

/**
 * BRAND briefing form — 9 mood chips + 4 audience options + one free-text
 * field per decisions A1 / B4 / B5. Deliberately short (≤ 30 seconds to
 * fill) so kids commit to a first attempt before re-rolling.
 */
export function BrandBriefingForm({
  onSubmit,
  disabled,
  predictedCostInr,
  helperText,
}: BrandBriefingFormProps) {
  const [mood, setMood] = useState<BrandMood>('playful');
  const [audience, setAudience] = useState<BrandAudience>('kids_my_age');
  const [oneWord, setOneWord] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = oneWord.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= ONE_WORD_MAX;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ mood, audience, oneWord: trimmed });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run your brief.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white p-4"
      aria-labelledby="brand-brief-heading"
    >
      <div>
        <h3
          id="brand-brief-heading"
          className="font-display text-sm font-bold text-slate-800"
        >
          Tell your Design Agent how your brand should feel
        </h3>
        <p className="text-xs text-slate-500">
          Three quick picks and one word. That&apos;s it.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Mood
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((m) => (
            <label
              key={m.id}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                mood === m.id
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="mood"
                value={m.id}
                checked={mood === m.id}
                onChange={() => setMood(m.id)}
                className="sr-only"
                aria-label={m.label}
              />
              <span aria-hidden="true" className="mr-1">
                {m.emoji}
              </span>
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Who is this for?
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {AUDIENCES.map((a) => (
            <label
              key={a.id}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                audience === a.id
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="audience"
                value={a.id}
                checked={audience === a.id}
                onChange={() => setAudience(a.id)}
                className="sr-only"
              />
              {a.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="oneWord"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          One word that captures your brand
        </label>
        <input
          id="oneWord"
          type="text"
          value={oneWord}
          onChange={(e) => setOneWord(e.target.value)}
          maxLength={ONE_WORD_MAX}
          placeholder="e.g. tropical, cozy, magic"
          disabled={disabled || submitting}
          aria-describedby="oneWordHelp"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:border-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 disabled:opacity-60"
        />
        <p id="oneWordHelp" className="mt-1 text-[11px] text-slate-400">
          {trimmed.length}/{ONE_WORD_MAX} — short, vivid, a feeling you want people to get.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={!canSubmit || submitting || disabled}
          aria-busy={submitting}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-3 font-display text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {submitting
            ? 'Designing…'
            : predictedCostInr !== undefined
              ? `Run for ₹${predictedCostInr}`
              : 'Run the brief'}
        </button>
        {helperText ? (
          <p className="text-[11px] text-slate-500">{helperText}</p>
        ) : null}
      </div>
    </form>
  );
}
