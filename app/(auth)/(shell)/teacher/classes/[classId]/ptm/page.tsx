'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  avatar?: string;
}

interface PtmNote {
  id: string;
  kidId: string;
  term: string;
  body: string;
  status: 'draft' | 'sent' | 'acknowledged';
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3', 'Annual'] as const;

export default function PtmNotesPage() {
  const params = useParams<{ classId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, getIdToken } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<PtmNote[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [term, setTerm] = useState<string>(TERM_OPTIONS[0]);
  const [body, setBody] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth gate.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/teacher/login');
      return;
    }
    if (!user || user.role === undefined) return;
    if (user.role !== 'teacher' && user.role !== 'schoolAdmin') {
      router.replace('/teacher/login');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Load roster + notes.
  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    let schoolId = search.get('schoolId');
    if (!schoolId) {
      const verify = await fetch('/api/auth/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (verify.ok) {
        const j = await verify.json();
        schoolId = j.data?.schoolId ?? null;
      }
    }
    if (!schoolId) {
      setError('No school context — return to dashboard.');
      setLoading(false);
      return;
    }

    const [classRes, notesRes] = await Promise.all([
      fetch(`/api/schools/${schoolId}/classes/${params.classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/comms/ptm-notes?classId=${params.classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (classRes.ok) {
      const j = await classRes.json();
      setStudents((j.data?.students ?? []) as Student[]);
    }
    if (notesRes.ok) {
      const j = await notesRes.json();
      setNotes((j.data?.notes ?? []) as PtmNote[]);
    }
    setLoading(false);
  }, [getIdToken, params.classId, search]);

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'teacher' || user.role === 'schoolAdmin')) {
      void load();
    }
  }, [isAuthenticated, user, load]);

  const selectedKid = useMemo(
    () => students.find((s) => s.id === selectedKidId) ?? null,
    [students, selectedKidId],
  );
  const kidNotes = useMemo(
    () => notes.filter((n) => n.kidId === selectedKidId),
    [notes, selectedKidId],
  );

  async function draftWithAi() {
    if (!selectedKidId) return;
    setError(null);
    setDrafting(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/comms/ptm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidId: selectedKidId, term }),
      });
      const j = await res.json();
      if (!res.ok) {
        throw new Error(j?.error?.message ?? 'AI draft failed.');
      }
      const draft = j.data?.draft;
      const drafted =
        draft && typeof draft === 'object'
          ? [
              draft.summary,
              draft.strengths && `Strengths: ${draft.strengths}`,
              draft.areasToImprove && `Focus areas: ${draft.areasToImprove}`,
              draft.suggestedActions && `Next steps: ${draft.suggestedActions}`,
            ]
              .filter(Boolean)
              .join('\n\n')
          : '';
      setBody(drafted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI draft failed.');
    } finally {
      setDrafting(false);
    }
  }

  async function saveDraft() {
    if (!selectedKidId || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/comms/ptm-notes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: params.classId, kidId: selectedKidId, term, body }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message ?? 'Save failed.');
      setNotes((prev) => [j.data.note as PtmNote, ...prev]);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function markSent(noteId: string) {
    setSending(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/comms/ptm-notes/${noteId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      if (res.ok) {
        const j = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === noteId ? (j.data.note as PtmNote) : n)));
      }
    } finally {
      setSending(false);
    }
  }

  async function deleteNote(noteId: string) {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`/api/comms/ptm-notes/${noteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-text-secondary">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href={`/teacher/classes/${params.classId}`}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-text-secondary transition hover:bg-gray-100"
            aria-label="Back to class"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-text sm:text-3xl">
              PTM Notes
            </h1>
            <p className="text-sm text-brand-text-secondary">
              Draft talking points per student, save, and mark sent when shared with parents.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Roster */}
        <aside className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto rounded-2xl bg-white p-2 shadow-card">
          {students.length === 0 ? (
            <p className="p-3 text-sm text-brand-text-secondary">No students in this class.</p>
          ) : (
            students.map((s) => {
              const noteCount = notes.filter((n) => n.kidId === s.id).length;
              const active = s.id === selectedKidId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedKidId(s.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-left transition',
                    active
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'hover:bg-gray-50 text-brand-text',
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-sm">
                    {s.avatar ?? '🧒'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="text-[11px] text-brand-text-secondary">
                      {noteCount} note{noteCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* Editor + history */}
        <section className="flex flex-col gap-4">
          {!selectedKid ? (
            <div className="rounded-2xl bg-white p-10 text-center text-brand-text-secondary shadow-card">
              Pick a student on the left to draft a PTM note.
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-white p-5 shadow-card">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-brand-text">
                      {selectedKid.name}
                    </h2>
                    <p className="text-xs text-brand-text-secondary">Term:</p>
                  </div>
                  <select
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-text"
                  >
                    {TERM_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Draft your talking points or click ‘Draft with AI’ to start from a summary."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-sm leading-relaxed text-brand-text outline-none transition focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20"
                />

                {error && (
                  <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {error}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={draftWithAi}
                    disabled={drafting}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-ai/10 px-3 py-1.5 text-xs font-semibold text-brand-ai transition hover:bg-brand-ai/15 disabled:opacity-50"
                  >
                    {drafting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {drafting ? 'Drafting…' : 'Draft with AI'}
                  </button>
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={saving || !body.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-primary/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save draft
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-card">
                <h3 className="mb-3 font-display text-sm font-bold text-brand-text">
                  History
                </h3>
                {kidNotes.length === 0 ? (
                  <p className="text-xs text-brand-text-secondary">
                    No saved notes yet for this student.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {kidNotes.map((n) => (
                      <li
                        key={n.id}
                        className="flex flex-col gap-2 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-start"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-muted">
                            {n.term} ·{' '}
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5',
                                n.status === 'draft' && 'bg-amber-100 text-amber-700',
                                n.status === 'sent' && 'bg-emerald-100 text-emerald-700',
                                n.status === 'acknowledged' &&
                                  'bg-violet-100 text-violet-700',
                              )}
                            >
                              {n.status}
                            </span>
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-brand-text">
                            {n.body}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {n.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => markSent(n.id)}
                              disabled={sending}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-50"
                            >
                              <Send className="h-3 w-3" />
                              Mark sent
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteNote(n.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-brand-text-secondary transition hover:bg-rose-100 hover:text-rose-700"
                            aria-label="Delete note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
