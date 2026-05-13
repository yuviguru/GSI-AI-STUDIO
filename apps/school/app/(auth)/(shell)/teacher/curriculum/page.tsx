'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, Tag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  listChapters,
  searchChapters,
  type ChapterEntry,
  type Subject,
} from '@/lib/curriculum/ncertIndex';
import { cn } from '@/lib/utils';

const SUBJECTS: Array<{ label: string; value: Subject | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Science', value: 'Science' },
  { label: 'Mathematics', value: 'Mathematics' },
  { label: 'English', value: 'English' },
  { label: 'Social Science', value: 'Social Science' },
  { label: 'Hindi', value: 'Hindi' },
];

export default function CurriculumBrowsePage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [subject, setSubject] = useState<Subject | 'all'>('all');
  const [classGrade, setClassGrade] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ChapterEntry | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/teacher/login');
      return;
    }
    if (user && user.role !== 'teacher' && user.role !== 'schoolAdmin') {
      router.replace('/');
    }
  }, [loading, isAuthenticated, user, router]);

  const allChapters = useMemo(() => listChapters(), []);

  const classes = useMemo(() => {
    const set = new Set(allChapters.map((c) => c.class));
    return ['all', ...Array.from(set).sort()];
  }, [allChapters]);

  const filtered = useMemo(() => {
    const base = query.trim()
      ? searchChapters(query, 50)
      : listChapters({
          subject: subject === 'all' ? undefined : subject,
          classGrade: classGrade === 'all' ? undefined : classGrade,
        });
    return base.filter((c) => {
      if (subject !== 'all' && c.subject !== subject) return false;
      if (classGrade !== 'all' && c.class !== classGrade) return false;
      return true;
    });
  }, [subject, classGrade, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ChapterEntry[]>();
    for (const c of filtered) {
      const key = `${c.class} · ${c.subject}`;
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-brand-text sm:text-3xl">
          NCERT Curriculum
        </h1>
        <p className="text-sm text-brand-text-secondary">
          Browse chapters by class and subject. Concepts are AI-CT-tagged for cross-reference.
        </p>
      </header>

      {/* Filters */}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chapter, key term, or concept…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20"
            />
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject | 'all')}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-brand-text"
          >
            {SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={classGrade}
            onChange={(e) => setClassGrade(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-brand-text"
          >
            {classes.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All classes' : `Class ${c}`}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-[11px] text-brand-text-muted">
          {filtered.length} chapter{filtered.length === 1 ? '' : 's'} match
          {query.trim() && ` "${query}"`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Chapter list */}
        <div className="flex flex-col gap-4">
          {grouped.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center text-brand-text-secondary shadow-card">
              No chapters match these filters.
            </div>
          ) : (
            grouped.map(([heading, chapters]) => (
              <section key={heading} className="rounded-2xl bg-white p-4 shadow-card">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-brand-text-secondary">
                  Class {heading}
                </h2>
                <ul className="mt-2 flex flex-col gap-1">
                  {chapters.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition',
                          selected?.id === c.id
                            ? 'bg-brand-primary/10 text-brand-primary'
                            : 'hover:bg-gray-50',
                        )}
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-[11px] font-bold text-brand-primary">
                          {c.chapterNumber}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-brand-text">
                            {c.chapterName}
                          </span>
                          <span className="text-[11px] text-brand-text-secondary">
                            {c.durationHours}h · {c.aiCtConceptTags.length} concept
                            {c.aiCtConceptTags.length === 1 ? '' : 's'}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {/* Detail panel */}
        <aside className="self-start lg:sticky lg:top-4">
          {selected ? (
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted">
                    Class {selected.class} · {selected.subject} · {selected.board.toUpperCase()}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold text-brand-text">
                    {selected.chapterNumber}. {selected.chapterName}
                  </h3>
                </div>
                <BookOpen className="h-5 w-5 shrink-0 text-brand-primary" />
              </div>
              <p className="mt-2 text-xs text-brand-text-secondary">
                Suggested duration: {selected.durationHours}h
              </p>

              <div className="mt-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-text-secondary">
                  Learning outcomes
                </h4>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-brand-text">
                  {selected.learningOutcomes.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>

              {selected.keyTerms && selected.keyTerms.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-text-secondary">
                    Key terms
                  </h4>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {selected.keyTerms.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.aiCtConceptTags.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-text-secondary">
                    AI/CT concepts
                  </h4>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {selected.aiCtConceptTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={`/teacher/lessons?chapterId=${selected.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary/90"
                >
                  Plan lesson
                </a>
                <a
                  href={`/teacher/papers?chapterId=${selected.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/15"
                >
                  Generate paper
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white/50 p-6 text-center text-sm text-brand-text-secondary">
              Pick a chapter on the left to see learning outcomes, key terms, and AI/CT concepts.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
