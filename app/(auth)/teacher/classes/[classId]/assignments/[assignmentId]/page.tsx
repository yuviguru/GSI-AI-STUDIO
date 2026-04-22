'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SubmissionGrid, type SubmissionRow } from '@/components/teacher/SubmissionGrid';
import { SubmissionReview } from '@/components/teacher/SubmissionReview';
import type { AssignmentDoc, SubmissionStatus } from '@/types/user.types';

export default function AssignmentReviewPage() {
  const params = useParams<{ classId: string; assignmentId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user, loading, isAuthenticated, getIdToken } = useAuth();

  const [assignment, setAssignment] = useState<AssignmentDoc | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [totalExpected, setTotalExpected] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/teacher/login');
      return;
    }
    if (!user || user.role === undefined) return;
    if (user.role !== 'teacher' && user.role !== 'schoolAdmin') {
      router.replace('/teacher/login');
    }
  }, [loading, isAuthenticated, user, router]);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const [subsRes, classRes] = await Promise.all([
      fetch(`/api/assignments/${params.assignmentId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      search.get('schoolId')
        ? fetch(
            `/api/schools/${search.get('schoolId')}/classes/${params.classId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          )
        : Promise.resolve<Response | null>(null),
    ]);
    const subsJson = await subsRes.json();
    if (!subsRes.ok) return;

    const raw = (subsJson.data?.submissions ?? []) as SubmissionRow[];
    const parsed = raw.map((s) => ({
      ...s,
      submittedAt: new Date(s.submittedAt),
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : undefined,
      creation: s.creation
        ? { ...s.creation, createdAt: new Date(s.creation.createdAt) }
        : null,
    }));
    setSubmissions(parsed);
    const a = subsJson.data?.assignment;
    if (a) {
      setAssignment({
        ...a,
        dueDate: new Date(a.dueDate),
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt),
      });
    }

    if (classRes && classRes.ok) {
      const classJson = await classRes.json();
      const students = classJson.data?.students ?? [];
      setTotalExpected(students.length);
    }
    setLoadingData(false);
  }, [getIdToken, params.assignmentId, params.classId, search]);

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'teacher' || user.role === 'schoolAdmin')) {
      void load();
    }
  }, [isAuthenticated, user, load]);

  const review = useCallback(
    async (
      submissionId: string,
      input: { status?: SubmissionStatus; feedback?: string | null; starred?: boolean },
    ) => {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(
        `/api/assignments/${params.assignmentId}/submissions/${submissionId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        },
      );
      if (!res.ok) return;
      const json = await res.json();
      const updated = json.data;
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                ...updated,
                submittedAt: new Date(updated.submittedAt ?? s.submittedAt),
                createdAt: new Date(updated.createdAt ?? s.createdAt),
                updatedAt: new Date(updated.updatedAt ?? s.updatedAt),
                reviewedAt: updated.reviewedAt
                  ? new Date(updated.reviewedAt)
                  : s.reviewedAt,
                creation: s.creation,
                kid: s.kid,
              }
            : s,
        ),
      );
    },
    [getIdToken, params.assignmentId],
  );

  const bulkApprove = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    await fetch(`/api/assignments/${params.assignmentId}/submissions`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'bulk_approve_pending' }),
    });
    await load();
  }, [getIdToken, params.assignmentId, load]);

  const selected = useMemo(
    () => submissions.find((s) => s.id === selectedId) ?? null,
    [submissions, selectedId],
  );
  const selectedIndex = submissions.findIndex((s) => s.id === selectedId);
  const prevId =
    selectedIndex > 0 ? submissions[selectedIndex - 1]!.id : undefined;
  const nextId =
    selectedIndex >= 0 && selectedIndex < submissions.length - 1
      ? submissions[selectedIndex + 1]!.id
      : undefined;

  if (loading || loadingData) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading submissions…</p>;
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/teacher/classes/${params.classId}?schoolId=${search.get('schoolId') ?? ''}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-purple"
      >
        <ArrowLeft className="h-4 w-4" /> Back to class
      </Link>

      {assignment && (
        <header className="rounded-3xl border border-gray-100 bg-white p-5">
          <h1 className="font-display text-xl font-bold text-gray-900">{assignment.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{assignment.description}</p>
          <p className="mt-2 text-xs text-gray-400">
            {assignment.creationType} · Due {assignment.dueDate.toLocaleDateString()}
          </p>
        </header>
      )}

      <SubmissionGrid
        submissions={submissions}
        totalExpected={totalExpected}
        selectedId={selectedId ?? undefined}
        onSelect={setSelectedId}
        onBulkApprove={bulkApprove}
      />

      {selected && (
        <SubmissionReview
          submission={selected}
          assignmentId={params.assignmentId}
          onReview={review}
          onPrev={prevId ? () => setSelectedId(prevId) : undefined}
          onNext={nextId ? () => setSelectedId(nextId) : undefined}
        />
      )}
    </div>
  );
}
