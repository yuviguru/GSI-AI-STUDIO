'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getConceptsForCreation,
  CURRICULUM_CATEGORIES,
  type CurriculumCategory,
  type CurriculumConcept,
} from '@/lib/curriculum/curriculumMap';
import type { CreationType } from '@/types/creation.types';
import type { AssignmentDoc, ClassDoc } from '@/types/user.types';

const CREATION_TYPES: { id: CreationType; label: string; emoji: string }[] = [
  { id: 'story', label: 'Story', emoji: '📖' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'quiz', label: 'Quiz', emoji: '🧠' },
  { id: 'game', label: 'Game', emoji: '🎮' },
  { id: 'comic', label: 'Comic', emoji: '💬' },
];

interface Props {
  classes: ClassDoc[];
  defaultClassId?: string;
  onCreated: (assignment: AssignmentDoc) => void;
  onClose: () => void;
  getIdToken: () => Promise<string | null>;
}

export function AssignmentCreator({
  classes,
  defaultClassId,
  onCreated,
  onClose,
  getIdToken,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creationType, setCreationType] = useState<CreationType>('story');
  const [classId, setClassId] = useState(defaultClassId ?? classes[0]?.id ?? '');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conceptsGrouped = useMemo(() => {
    const concepts = getConceptsForCreation(creationType);
    const groups: Partial<Record<CurriculumCategory, CurriculumConcept[]>> = {};
    for (const c of concepts) {
      (groups[c.category] ??= []).push(c);
    }
    return groups;
  }, [creationType]);

  function toggleTag(id: string) {
    setTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function submit() {
    setError(null);
    if (title.trim().length < 1) return setError('Give the assignment a title.');
    if (description.trim().length < 1)
      return setError('Add instructions for your students.');
    if (!classId) return setError('Pick a class.');

    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Sign in as a teacher to continue.');
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          title: title.trim(),
          description: description.trim(),
          creationType,
          dueDate: new Date(`${dueDate}T23:59:00`).toISOString(),
          curriculumTags: tags,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Could not create assignment.');
      onCreated(json.data as AssignmentDoc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="font-display text-xl font-bold text-gray-900">Create assignment</h2>
        <p className="mt-1 text-sm text-gray-500">
          Students in the selected class will see this in their dashboard.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="Create a story about the water cycle"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Instructions
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder="What should students focus on? Any specific characters, concepts, or ideas to include?"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-gray-700">
              Class
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · Grade {c.grade}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </label>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">Creation type</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CREATION_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setCreationType(t.id);
                    setTags([]); // reset tags when type changes — available concepts differ
                  }}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm font-medium transition',
                    creationType === t.id
                      ? 'border-purple-400 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-purple-200',
                  )}
                >
                  <span className="mr-1.5">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">
              Curriculum alignment
              <span className="ml-2 text-xs font-normal text-gray-400">
                (optional — used for compliance reports)
              </span>
            </p>
            <div className="mt-2 space-y-3">
              {(Object.entries(conceptsGrouped) as [CurriculumCategory, CurriculumConcept[]][]).map(
                ([cat, concepts]) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {CURRICULUM_CATEGORIES[cat].label}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {concepts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleTag(c.id)}
                          title={c.description}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-medium transition',
                            tags.includes(c.id)
                              ? 'border-purple-400 bg-purple-100 text-purple-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-purple-200',
                          )}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
                submitting ? 'bg-gray-300' : 'bg-purple-600 hover:bg-purple-700',
              )}
            >
              {submitting ? 'Assigning…' : 'Assign to class'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
