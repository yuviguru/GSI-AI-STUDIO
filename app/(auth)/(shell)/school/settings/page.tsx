'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SchoolSettings } from '@/components/admin/SchoolSettings';
import type { SchoolDoc } from '@/types/user.types';

export default function SchoolSettingsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, getIdToken } = useAuth();
  const [school, setSchool] = useState<SchoolDoc | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/teacher/login');
      return;
    }
    if (user && user.role !== 'schoolAdmin') router.replace('/teacher');
  }, [loading, isAuthenticated, user, router]);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;

    const verifyRes = await fetch('/api/auth/teacher', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!verifyRes.ok) {
      router.replace('/teacher/login');
      return;
    }
    const verifyJson = await verifyRes.json();
    const schoolId: string | undefined = verifyJson.data?.schoolId;
    if (!schoolId) return;

    const res = await fetch(`/api/schools/${schoolId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) setSchool(json.data as SchoolDoc);
    }
    setLoadingData(false);
  }, [getIdToken, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'schoolAdmin') void load();
  }, [isAuthenticated, user, load]);

  if (loading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Loading school settings…</p>
      </div>
    );
  }
  if (!school) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">School not found.</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">School Settings</h1>
        <p className="text-sm text-slate-600">
          Update school details, upload your logo and letterhead, and manage your plan.
        </p>
      </header>
      <SchoolSettings school={school} onUpdated={(next) => setSchool(next)} />
    </main>
  );
}
