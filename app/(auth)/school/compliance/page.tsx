'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DpoDashboard } from '@/components/admin/DpoDashboard';

export default function CompliancePage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/teacher/login');
      return;
    }
    if (user && user.role !== 'schoolAdmin') router.replace('/teacher');
  }, [loading, isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Compliance &amp; DPO</h1>
        <p className="mt-1 text-sm text-slate-600">
          Live snapshot of CBSE AI-CT coverage signals + DPDP Act 2023
          data-processing register. Generate a single PDF that satisfies both
          audits.
        </p>
      </header>
      <DpoDashboard />
    </div>
  );
}
