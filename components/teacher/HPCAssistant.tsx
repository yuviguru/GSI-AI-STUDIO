'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Download, FileText, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  kidId: string;
  kidName: string;
  grade?: string;
  onClose: () => void;
}

type Locale = 'en' | 'hi';

interface Draft {
  cognitive: string;
  affective: string;
  psychomotor: string;
  nextTermFocus: string;
}

const QUICK_TAGS = [
  'punctual',
  'creative',
  'collaborative',
  'curious',
  'independent',
  'needs support in reading',
  'needs support in logical reasoning',
  'strong at storytelling',
  'strong at building',
  'struggling with focus',
  'improving rapidly',
  'rarely submits on time',
];

function defaultTerm(): string {
  const now = new Date();
  const year = now.getFullYear();
  // Indian academic year broadly Apr-Mar; term guesses: T1 Apr-Sep, T2 Oct-Mar.
  const term = now.getMonth() >= 9 || now.getMonth() <= 2 ? 'T2' : 'T1';
  return `${year}-${term}`;
}

function defaultTermStart(): string {
  const now = new Date();
  const year = now.getFullYear();
  const t2 = now.getMonth() >= 9 || now.getMonth() <= 2;
  const start = t2 ? new Date(year, 9, 1) : new Date(year, 3, 1);
  return start.toISOString().slice(0, 10);
}

export function HPCAssistant({ kidId, kidName, grade, onClose }: Props) {
  const { getIdToken } = useAuth();
  const [term, setTerm] = useState(defaultTerm());
  const [termStart, setTermStart] = useState(defaultTermStart());
  const [locale, setLocale] = useState<Locale>('en');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'draft_saved' | 'published'>('idle');

  const canGenerate = useMemo(() => term.trim().length >= 2 && !!termStart, [term, termStart]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/hpc/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kidId,
          term,
          termStart,
          locale,
          teacherTags: selectedTags,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.error?.code === 'FORBIDDEN_CONSENT') {
          throw new Error(
            'Parent has not granted AI-generation consent for this student. Ask the parent to enable it in Data & privacy.',
          );
        }
        throw new Error(json?.error?.message ?? 'Could not draft HPC.');
      }
      setDraft(json.data.draft as Draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft HPC.');
    } finally {
      setGenerating(false);
    }
  }

  async function persist(statusToSave: 'draft' | 'published') {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/hpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kidId,
          term,
          locale,
          cognitive: draft.cognitive,
          affective: draft.affective,
          psychomotor: draft.psychomotor,
          nextTermFocus: draft.nextTermFocus,
          teacherTags: selectedTags,
          status: statusToSave,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Save failed');
      setStatus(statusToSave === 'published' ? 'published' : 'draft_saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function exportPdf() {
    const token = await getIdToken();
    const url = `/api/hpc/${encodeURIComponent(kidId)}/export?kidId=${encodeURIComponent(kidId)}&term=${encodeURIComponent(term)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError('Could not generate PDF — make sure you saved the narrative first.');
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank');
    // Revoke after a delay to allow the new tab to load.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              HPC Narrative · {kidName}
              {grade ? ` · Grade ${grade}` : ''}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              NEP 2020 Holistic Progress Card draft. Edit freely before publishing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {!draft && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Term">
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value.slice(0, 40))}
                    placeholder="2026-T2"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Term start">
                  <input
                    type="date"
                    value={termStart}
                    onChange={(e) => setTermStart(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Language">
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as Locale)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                </Field>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Quick-tags (optional, helps ground the draft)
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition',
                        selectedTags.includes(t)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {draft && (
            <div className="space-y-4">
              <EditorBlock
                label="Cognitive domain"
                value={draft.cognitive}
                onChange={(v) => setDraft({ ...draft, cognitive: v })}
              />
              <EditorBlock
                label="Affective domain"
                value={draft.affective}
                onChange={(v) => setDraft({ ...draft, affective: v })}
              />
              <EditorBlock
                label="Psychomotor domain"
                value={draft.psychomotor}
                onChange={(v) => setDraft({ ...draft, psychomotor: v })}
              />
              <EditorBlock
                label="Next-term focus"
                value={draft.nextTermFocus}
                onChange={(v) => setDraft({ ...draft, nextTermFocus: v })}
              />
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {status === 'draft_saved' && (
            <p className="mt-3 text-xs text-emerald-700">Draft saved.</p>
          )}
          {status === 'published' && (
            <p className="mt-3 text-xs text-emerald-700">Published. Export the PDF below.</p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">
          {!draft ? (
            <>
              <button
                onClick={onClose}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={generate}
                disabled={!canGenerate || generating}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {generating ? 'Drafting…' : 'Draft HPC narrative'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setDraft(null)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Discard draft
              </button>
              <button
                onClick={() => persist('draft')}
                disabled={saving}
                className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
              >
                Save draft
              </button>
              <button
                onClick={() => persist('published')}
                disabled={saving}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                Publish
              </button>
              <button
                onClick={exportPdf}
                disabled={status !== 'published'}
                title={status === 'published' ? 'Export as PDF' : 'Publish first to enable export'}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function EditorBlock({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
        <FileText className="h-3 w-3" /> {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 2000))}
        rows={4}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm leading-relaxed"
      />
    </label>
  );
}
