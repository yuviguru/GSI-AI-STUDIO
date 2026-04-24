'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

export interface SimpleBriefField {
  id: string;
  label: string;
  description?: string;
  /** When provided, this field is a multiple-choice picker. Otherwise,
   *  a ≤ `maxChars` free-text input. */
  options?: ReadonlyArray<{ id: string; label: string; emoji?: string }>;
  maxChars?: number;
  placeholder?: string;
  optional?: boolean;
}

export interface SimpleBriefingFormProps {
  title: string;
  description: string;
  fields: ReadonlyArray<SimpleBriefField>;
  /** Default values — allows agents to pre-pick the safe/common option. */
  initialValues?: Record<string, string>;
  predictedCostInr?: number;
  helperText?: string;
  accent?: 'sky' | 'purple' | 'emerald' | 'amber';
  onSubmit: (values: Record<string, string>) => Promise<void>;
}

const ACCENTS = {
  sky: 'from-sky-500 to-indigo-500 focus-visible:outline-sky-600 border-sky-500 bg-sky-50 text-sky-700',
  purple:
    'from-purple-500 to-indigo-500 focus-visible:outline-purple-600 border-purple-500 bg-purple-50 text-purple-700',
  emerald:
    'from-emerald-500 to-teal-500 focus-visible:outline-emerald-600 border-emerald-500 bg-emerald-50 text-emerald-700',
  amber:
    'from-amber-500 to-orange-500 focus-visible:outline-amber-600 border-amber-500 bg-amber-50 text-amber-700',
} as const;

/**
 * Generic N-field briefing form used by agents whose brief is "pure
 * picks + optional text". Handles validation, submit button state,
 * predicted cost display, error surface.
 *
 * Brand + Marketing stick with their bespoke forms because they have
 * denser MC options (9 moods; bespoke emoji treatment). Ops + Finance
 * use this generic one.
 */
export function SimpleBriefingForm({
  title,
  description,
  fields,
  initialValues,
  predictedCostInr,
  helperText,
  accent = 'sky',
  onSubmit,
}: SimpleBriefingFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of fields) {
      initial[f.id] = initialValues?.[f.id] ?? f.options?.[0]?.id ?? '';
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classes = ACCENTS[accent];

  function setField(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  const canSubmit = fields.every((f) => {
    const v = values[f.id] ?? '';
    if (f.optional) return true;
    if (f.options) return f.options.some((o) => o.id === v);
    const trimmed = v.trim();
    return trimmed.length > 0 && (!f.maxChars || trimmed.length <= f.maxChars);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run the brief.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4">
      <div>
        <h3 className="font-display text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      {fields.map((field) => (
        <fieldset key={field.id}>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {field.label}
          </legend>
          {field.description && (
            <p className="-mt-1 mb-1 text-[11px] text-slate-400">{field.description}</p>
          )}
          {field.options ? (
            <div className="flex flex-wrap gap-1.5">
              {field.options.map((opt) => {
                const selected = values[field.id] === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      selected
                        ? classes.split(' ').filter((c) => c.startsWith('border-') || c.startsWith('bg-') || c.startsWith('text-')).join(' ')
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={field.id}
                      value={opt.id}
                      checked={selected}
                      onChange={() => setField(field.id, opt.id)}
                      className="sr-only"
                    />
                    {opt.emoji ? (
                      <span aria-hidden="true" className="mr-1">
                        {opt.emoji}
                      </span>
                    ) : null}
                    {opt.label}
                  </label>
                );
              })}
            </div>
          ) : (
            <>
              <input
                type="text"
                value={values[field.id] ?? ''}
                onChange={(e) => setField(field.id, e.target.value)}
                maxLength={field.maxChars}
                placeholder={field.placeholder}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-60"
              />
              {field.maxChars && (
                <p className="mt-1 text-[11px] text-slate-400">
                  {(values[field.id] ?? '').length}/{field.maxChars}
                </p>
              )}
            </>
          )}
        </fieldset>
      ))}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          aria-busy={submitting}
          className={`inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-r ${
            classes.split(' ').filter((c) => c.startsWith('from-') || c.startsWith('to-') || c.startsWith('focus-visible:outline-')).join(' ')
          } px-5 py-3 font-display text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {submitting
            ? 'Working…'
            : predictedCostInr !== undefined
              ? `Run for ₹${predictedCostInr}`
              : 'Run the brief'}
        </button>
        {helperText ? <p className="text-[11px] text-slate-500">{helperText}</p> : null}
      </div>
    </form>
  );
}
