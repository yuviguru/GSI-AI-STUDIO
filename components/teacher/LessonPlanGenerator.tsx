'use client';

import { useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ChapterPicker } from './ChapterPicker';
import type { ChapterEntry } from '@/lib/curriculum/ncertIndex';
import type {
  LessonPlanDraft,
  StudioId,
} from '@gsi/ai/lessonPlanGenerator';

const STUDIO_OPTIONS: Array<StudioId | ''> = ['', 'story', 'music', 'quiz', 'game', 'comic'];

interface Props {
  onSaved?: (planId: string) => void;
}

export function LessonPlanGenerator({ onSaved }: Props) {
  const { getIdToken } = useAuth();
  const [chapter, setChapter] = useState<ChapterEntry | null>(null);
  const [duration, setDuration] = useState(40);
  const [locale, setLocale] = useState<'en' | 'hi'>('en');
  const [studio, setStudio] = useState<StudioId | ''>('');
  const [draft, setDraft] = useState<LessonPlanDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function generate() {
    if (!chapter) return;
    setGenerating(true);
    setError(null);
    setSavedId(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/lessons/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chapterId: chapter.id,
          durationMinutes: duration,
          locale,
          studioPreference: studio || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Generate failed');
      setDraft(json.data.draft as LessonPlanDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate failed');
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!chapter || !draft) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chapterId: chapter.id,
          durationMinutes: duration,
          locale,
          draft,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Save failed');
      const id = json.data?.plan?.id as string;
      setSavedId(id);
      onSaved?.(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function patchDraft<K extends keyof LessonPlanDraft>(key: K, value: LessonPlanDraft[K]) {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Pick a chapter</h3>
        <div className="mt-2">
          <ChapterPicker
            value={chapter?.id}
            onChange={(_id, c) => setChapter(c)}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">Duration (min)</span>
            <input
              type="number"
              min={15}
              max={120}
              value={duration}
              onChange={(e) => setDuration(Math.max(15, Math.min(120, Number(e.target.value) || 40)))}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
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
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-700">
              Tie-in studio (optional)
            </span>
            <select
              value={studio}
              onChange={(e) => setStudio(e.target.value as StudioId | '')}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              {STUDIO_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s ? s : 'Let AI choose'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={!chapter || generating}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? 'Drafting…' : 'Draft lesson plan'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {draft && chapter && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <DraftField
            label="Learning outcomes"
            value={draft.learningOutcomes.join('\n')}
            onChange={(v) =>
              patchDraft(
                'learningOutcomes',
                v.split('\n').map((s) => s.trim()).filter(Boolean),
              )
            }
            rows={4}
          />
          <DraftField
            label="Hook activity"
            value={draft.hookActivity}
            onChange={(v) => patchDraft('hookActivity', v)}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <DraftField
              label="Main activity title"
              value={draft.mainActivity.title}
              onChange={(v) =>
                patchDraft('mainActivity', { ...draft.mainActivity, title: v })
              }
              rows={2}
            />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Linked studio</span>
              <select
                value={draft.mainActivity.linkedStudio ?? ''}
                onChange={(e) =>
                  patchDraft('mainActivity', {
                    ...draft.mainActivity,
                    linkedStudio: (e.target.value || null) as StudioId | null,
                  })
                }
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">None</option>
                <option value="story">Story</option>
                <option value="music">Music</option>
                <option value="quiz">Quiz</option>
                <option value="game">Game</option>
                <option value="comic">Comic</option>
              </select>
            </label>
          </div>
          <DraftField
            label="Main activity description"
            value={draft.mainActivity.description}
            onChange={(v) =>
              patchDraft('mainActivity', { ...draft.mainActivity, description: v })
            }
            rows={3}
          />
          <DraftField
            label="Closure"
            value={draft.closure}
            onChange={(v) => patchDraft('closure', v)}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <DraftField
              label="Assessment type"
              value={draft.assessment.type}
              onChange={(v) => patchDraft('assessment', { ...draft.assessment, type: v })}
              rows={2}
            />
            <DraftField
              label="Sample assessment item"
              value={draft.assessment.sample}
              onChange={(v) => patchDraft('assessment', { ...draft.assessment, sample: v })}
              rows={2}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DraftField
              label="Differentiation — supports"
              value={draft.differentiation.lower}
              onChange={(v) =>
                patchDraft('differentiation', { ...draft.differentiation, lower: v })
              }
              rows={2}
            />
            <DraftField
              label="Differentiation — extensions"
              value={draft.differentiation.higher}
              onChange={(v) =>
                patchDraft('differentiation', { ...draft.differentiation, higher: v })
              }
              rows={2}
            />
          </div>
          <DraftField
            label="Materials"
            value={draft.materials.join('\n')}
            onChange={(v) =>
              patchDraft(
                'materials',
                v.split('\n').map((s) => s.trim()).filter(Boolean),
              )
            }
            rows={3}
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save lesson plan'}
            </button>
            {savedId && (
              <span className="text-xs text-emerald-700">
                Saved · ID {savedId.slice(0, 8)}…
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DraftField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 2000))}
        rows={rows}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm leading-relaxed"
      />
    </label>
  );
}
