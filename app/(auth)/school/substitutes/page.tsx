'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SubstituteFinder } from '@/components/admin/SubstituteFinder';

export default function SubstitutesPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, getIdToken } = useAuth();
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/teacher/login');
      return;
    }
    if (user && user.role !== 'schoolAdmin') router.replace('/teacher');
  }, [loading, isAuthenticated, user, router]);

  const resolveSchool = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/auth/teacher', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    setSchoolId((json.data?.schoolId as string) ?? null);
  }, [getIdToken]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'schoolAdmin') void resolveSchool();
  }, [isAuthenticated, user, resolveSchool]);

  if (loading || !schoolId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Substitute Finder</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mark a teacher absent, see ranked replacements per period, and draft
          handover instructions in seconds.
        </p>
      </header>
      <SubstituteFinder schoolId={schoolId} />
    </div>
  );
}
