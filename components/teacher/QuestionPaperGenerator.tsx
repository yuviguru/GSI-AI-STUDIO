'use client';

import { useState } from 'react';
import { AlertCircle, Download, Plus, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ChapterPicker } from './ChapterPicker';
import type { ChapterEntry } from '@/lib/curriculum/ncertIndex';
import type {
  BloomLevel,
  PaperBlueprint,
  QuestionPaperDraft,
  QuestionTypeSpec,
} from '@gsi/ai/questionPaperGenerator';

const BLOOM_LEVELS: BloomLevel[] = [
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
];

const DEFAULT_TYPES: QuestionTypeSpec[] = [
  { type: 'mcq', count: 10, marksEach: 1 },
  { type: 'short', count: 5, marksEach: 3 },
  { type: 'long', count: 3, marksEach: 5 },
];

const DEFAULT_BLOOMS: Record<BloomLevel, number> = {
  remember: 20,
  understand: 30,
  apply: 25,
  analyze: 15,
  evaluate: 5,
  create: 5,
};

export function QuestionPaperGenerator({
  onSaved,
}: {
  onSaved?: (paperId: string) => void;
}) {
  const { getIdToken } = useAuth();
  const [chapters, setChapters] = useState<ChapterEntry[]>([]);
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeSpec[]>(DEFAULT_TYPES);
  const [blooms, setBlooms] = useState<Record<BloomLevel, number>>(DEFAULT_BLOOMS);
  const [totalMarks, setTotalMarks] = useState(80);
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [locale, setLocale] = useState<'en' | 'hi'>('en');
  const [draft, setDraft] = useState<QuestionPaperDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addChapter(_id: string, c: ChapterEntry) {
    if (chapters.find((x) => x.id === c.id)) return;
    if (chapters.length > 0) {
      const first = chapters[0]!;
      if (first.subject !== c.subject || first.class !== c.class) {
        setError('All chapters must share the same subject and class.');
        return;
      }
    }
    setError(null);
    setChapters([...chapters, c]);
  }

  function removeChapter(id: string) {
    setChapters(chapters.filter((c) => c.id !== id));
  }

  function patchType(idx: number, patch: Partial<QuestionTypeSpec>) {
    setQuestionTypes(questionTypes.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }
  function addType() {
    setQuestionTypes([
      ...questionTypes,
      { type: 'application', count: 2, marksEach: 4 },
    ]);
  }
  function removeType(idx: number) {
    setQuestionTypes(questionTypes.filter((_, i) => i !== idx));
  }

  async function generate() {
    if (chapters.length === 0) {
      setError('Pick at least one chapter.');
      return;
    }
    setGenerating(true);
    setError(null);
    setSavedId(null);
    try {
      const blueprint: PaperBlueprint = {
        bloomsDistribution: blooms,
        difficultyMix: { easy: 30, medium: 50, hard: 20 },
        questionTypes,
      };
      const token = await getIdToken();
      const res = await fetch('/api/papers/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: chapters[0]?.subject,
          classGrade: chapters[0]?.class,
          chapterIds: chapters.map((c) => c.id),
          blueprint,
          totalMarks,
          durationMinutes,
          locale,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Generate failed');
      setDraft(json.data.draft as QuestionPaperDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate failed');
    } finally {
      setGenerating(false);
    }
  }

  async function save(status: 'draft' | 'finalized') {
    if (!draft || chapters.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const blueprint: PaperBlueprint = {
        bloomsDistribution: blooms,
        difficultyMix: { easy: 30, medium: 50, hard: 20 },
        questionTypes,
      };
      const token = await getIdToken();
      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chapterIds: chapters.map((c) => c.id),
          blueprint,
          totalMarks,
          durationMinutes,
          locale,
          draft,
          status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Save failed');
      const id = json.data?.paper?.id as string;
      setSavedId(id);
      onSaved?.(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function exportVariant(variant: 'question' | 'answer' | 'blueprint') {
    if (!savedId) return;
    const token = await getIdToken();
    const res = await fetch(
      `/api/papers/${savedId}/export?variant=${variant}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      setError('PDF export failed.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Chapters in scope</h3>
        <div className="mt-2">
          <ChapterPicker
            onChange={addChapter}
            classGrade={chapters[0]?.class}
            subject={chapters[0]?.subject}
          />
        </div>
        {chapters.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {chapters.map((c) => (
              <li
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700"
              >
                <span>
                  Class {c.class} · {c.chapterName}
                </span>
                <button
                  type="button"
                  onClick={() => removeChapter(c.id)}
                  aria-label={`Remove ${c.chapterName}`}
                  className="rounded-full hover:bg-indigo-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Paper blueprint</h3>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <NumberField
            label="Total marks"
            value={totalMarks}
            onChange={setTotalMarks}
            min={10}
            max={200}
          />
          <NumberField
            label="Duration (min)"
            value={durationMinutes}
            onChange={setDurationMinutes}
            min={30}
            max={300}
          />
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">Language</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'hi')}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Question types
          </h4>
          <ul className="mt-2 space-y-2">
            {questionTypes.map((t, i) => (
              <li key={i} className="grid grid-cols-[1fr_80px_80px_30px] items-end gap-2">
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-slate-700">Type</span>
                  <select
                    value={t.type}
                    onChange={(e) => patchType(i, { type: e.target.value as QuestionTypeSpec['type'] })}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="mcq">MCQ</option>
                    <option value="short">Short answer</option>
                    <option value="long">Long answer</option>
                    <option value="application">Application</option>
                    <option value="case-study">Case study</option>
                  </select>
                </label>
                <NumberField
                  label="Count"
                  value={t.count}
                  onChange={(v) => patchType(i, { count: v })}
                  min={1}
                  max={50}
                />
                <NumberField
                  label="Marks each"
                  value={t.marksEach}
                  onChange={(v) => patchType(i, { marksEach: v })}
                  min={1}
                  max={20}
                />
                <button
                  type="button"
                  onClick={() => removeType(i)}
                  aria-label="Remove type"
                  className="mb-1 rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addType}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
          >
            <Plus className="h-3 w-3" /> Add type
          </button>
        </div>

        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Bloom&apos;s distribution (% of marks; should sum to ~100)
          </h4>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {BLOOM_LEVELS.map((b) => (
              <NumberField
                key={b}
                label={b}
                value={blooms[b]}
                onChange={(v) => setBlooms({ ...blooms, [b]: v })}
                min={0}
                max={100}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={chapters.length === 0 || generating}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? 'Drafting…' : 'Draft question paper'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {draft && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <p className="text-slate-700">
              Computed total: <strong>{draft.computedTotalMarks}</strong> marks
              {draft.computedTotalMarks !== totalMarks && (
                <span className="ml-2 text-amber-700">
                  (target {totalMarks})
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">
              Bloom&apos;s actual:{' '}
              {BLOOM_LEVELS.map((b) => `${b}=${draft.bloomsActualPct[b] ?? 0}%`).join(' · ')}
            </p>
          </div>
          {draft.sections.map((s, si) => (
            <section key={si} className="mb-4">
              <h4 className="text-sm font-semibold text-slate-900">{s.title}</h4>
              {s.instructions && (
                <p className="mt-0.5 text-xs italic text-slate-500">{s.instructions}</p>
              )}
              <ol className="mt-1 space-y-1 text-sm">
                {s.questions.map((q) => (
                  <li key={q.id} className="rounded border border-slate-100 p-2">
                    <p>
                      <span className="font-medium text-slate-700">{q.id}.</span>{' '}
                      <span className="text-xs text-slate-400">
                        ({q.marks} mk · {q.bloom} · {q.difficulty})
                      </span>{' '}
                      {q.text}
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-700">Ans: {q.answerKey}</p>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => save('draft')}
              disabled={saving}
              className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => save('finalized')}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Finalize
            </button>
            {savedId && (
              <>
                <button
                  type="button"
                  onClick={() => exportVariant('question')}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> Question PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportVariant('answer')}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> Answer key
                </button>
                <button
                  type="button"
                  onClick={() => exportVariant('blueprint')}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> Blueprint
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium capitalize text-slate-700">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) {
            const clamped =
              min !== undefined && n < min
                ? min
                : max !== undefined && n > max
                  ? max
                  : n;
            onChange(clamped);
          }
        }}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
      />
    </label>
  );
}
