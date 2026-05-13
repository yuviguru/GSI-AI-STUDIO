'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { QuestionPaperGenerator } from '@/components/teacher/QuestionPaperGenerator';
import type { QuestionPaperDoc } from '@gsi/firebase/questionPaperService';

export default function PapersPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, getIdToken } = useAuth();
  const [papers, setPapers] = useState<QuestionPaperDoc[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);

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

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/papers', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setPapers(
        (json.data?.papers ?? []).map(
          (p: QuestionPaperDoc & { createdAt: string; updatedAt: string }) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          }),
        ),
      );
    }
    setLoadingPapers(false);
  }, [getIdToken]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'teacher' || user?.role === 'schoolAdmin')) {
      void load();
    }
  }, [isAuthenticated, user, load]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Question papers</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pick chapters, set the blueprint, and Claude drafts a CBSE-aligned paper
          you can edit and export with your school&apos;s letterhead.
        </p>
      </header>

      <QuestionPaperGenerator onSaved={() => void load()} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Saved papers</h2>
        {loadingPapers ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : papers.length === 0 ? (
          <p className="rounded border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
            No saved papers yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded border border-slate-200">
            {papers.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {p.subject} · Class {p.classGrade}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.chapterIds.length} chapter(s) · {p.totalMarks} mk · {p.durationMinutes} min ·{' '}
                    {p.status} · {p.updatedAt.toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {p.locale}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
