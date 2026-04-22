'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

export type CampaignOffer = 'discount' | 'freebie' | 'premium';
export type CampaignVibe = 'energetic' | 'warm' | 'clever';

export interface CampaignBriefValue {
  offer: CampaignOffer;
  vibe: CampaignVibe;
  hook: string;
}

interface CampaignBriefingFormProps {
  onSubmit: (brief: CampaignBriefValue) => Promise<void>;
  disabled?: boolean;
  predictedCostInr?: number;
  helperText?: string;
}

const OFFERS: Array<{ id: CampaignOffer; label: string; description: string }> = [
  { id: 'discount', label: 'Discount', description: 'Limited-time price cut' },
  { id: 'freebie', label: 'Freebie', description: 'Something free for first-timers' },
  { id: 'premium', label: 'Premium', description: 'Upgrade for regulars' },
];

const VIBES: Array<{ id: CampaignVibe; label: string; emoji: string }> = [
  { id: 'energetic', label: 'Energetic', emoji: '⚡' },
  { id: 'warm', label: 'Warm', emoji: '☕' },
  { id: 'clever', label: 'Clever', emoji: '🧠' },
];

const HOOK_MAX = 25;

export function CampaignBriefingForm({
  onSubmit,
  disabled,
  predictedCostInr,
  helperText,
}: CampaignBriefingFormProps) {
  const [offer, setOffer] = useState<CampaignOffer>('discount');
  const [vibe, setVibe] = useState<CampaignVibe>('energetic');
  const [hook, setHook] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = hook.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= HOOK_MAX;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ offer, vibe, hook: trimmed });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run your campaign.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4">
      <div>
        <h3 className="font-display text-sm font-bold text-slate-800">
          Brief your Marketing Agent
        </h3>
        <p className="text-xs text-slate-500">
          Three quick picks and a hook. They&apos;ll ship three poster options + two
          caption variants.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Offer
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {OFFERS.map((o) => (
            <label
              key={o.id}
              title={o.description}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                offer === o.id
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="offer"
                value={o.id}
                checked={offer === o.id}
                onChange={() => setOffer(o.id)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Vibe
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {VIBES.map((v) => (
            <label
              key={v.id}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                vibe === v.id
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="vibe"
                value={v.id}
                checked={vibe === v.id}
                onChange={() => setVibe(v.id)}
                className="sr-only"
              />
              <span aria-hidden="true" className="mr-1">
                {v.emoji}
              </span>
              {v.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="campaign-hook"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          Your hook
        </label>
        <input
          id="campaign-hook"
          type="text"
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          maxLength={HOOK_MAX}
          placeholder="e.g. sunday surprise, bring a friend"
          disabled={disabled || submitting}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:border-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          {trimmed.length}/{HOOK_MAX} — short, catchy, in your kid voice.
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
          className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-3 font-display text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {submitting
            ? 'Designing campaign…'
            : predictedCostInr !== undefined
              ? `Run for ₹${predictedCostInr}`
              : 'Run the brief'}
        </button>
        {helperText ? <p className="text-[11px] text-slate-500">{helperText}</p> : null}
      </div>
    </form>
  );
}
