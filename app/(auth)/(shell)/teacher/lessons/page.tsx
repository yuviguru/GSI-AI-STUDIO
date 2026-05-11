'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LessonPlanGenerator } from '@/components/teacher/LessonPlanGenerator';
import type { LessonPlanDoc } from '@/lib/firebase/lessonPlanService';

export default function LessonsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, getIdToken } = useAuth();
  const [plans, setPlans] = useState<LessonPlanDoc[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

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
    const res = await fetch('/api/lessons', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setPlans(
        (json.data?.plans ?? []).map(
          (p: LessonPlanDoc & { createdAt: string; updatedAt: string }) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          }),
        ),
      );
    }
    setLoadingPlans(false);
  }, [getIdToken]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'teacher' || user?.role === 'schoolAdmin')) {
      void load();
    }
  }, [isAuthenticated, user, load]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Lesson plans</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pick a CBSE NCERT chapter and let Claude draft a lesson plan you can edit
          before saving.
        </p>
      </header>

      <LessonPlanGenerator onSaved={() => void load()} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Saved plans</h2>
        {loadingPlans ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="rounded border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
            No saved plans yet — draft your first one above.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded border border-slate-200">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {p.subject} · Class {p.classGrade} — {p.chapterName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.durationMinutes} min · {p.locale} ·{' '}
                    {p.updatedAt.toLocaleDateString()}
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
