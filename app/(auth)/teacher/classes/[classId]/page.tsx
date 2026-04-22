'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ClassManagement } from '@/components/teacher/ClassManagement';
import { AssignmentCreator } from '@/components/teacher/AssignmentCreator';
import { HPCAssistant } from '@/components/teacher/HPCAssistant';
import type { AssignmentDoc, ClassDoc } from '@/types/user.types';

interface Student {
  id: string;
  name: string;
  avatar?: string;
  grade?: string;
  totalCreations: number;
  aiPoints: number;
  conceptsLearned: string[];
  lastActiveDate?: string;
}

export default function ClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user, loading, isAuthenticated, getIdToken } = useAuth();

  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const [hpcStudent, setHpcStudent] = useState<Student | null>(null);

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

    // Resolve schoolId either from URL search param or via verify endpoint.
    let schoolId = search.get('schoolId');
    if (!schoolId) {
      const verifyRes = await fetch('/api/auth/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (verifyRes.ok) {
        const verifyJson = await verifyRes.json();
        schoolId = verifyJson.data?.schoolId ?? null;
      }
    }
    if (!schoolId) {
      router.replace('/teacher');
      return;
    }

    const [classRes, assignmentsRes] = await Promise.all([
      fetch(`/api/schools/${schoolId}/classes/${params.classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('/api/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const classJson = await classRes.json();
    const assignmentsJson = await assignmentsRes.json();
    if (classRes.ok) {
      setClassDoc(classJson.data?.class ?? null);
      setStudents(classJson.data?.students ?? []);
    }
    if (assignmentsRes.ok) {
      const all = (assignmentsJson.data?.assignments ?? []) as AssignmentDoc[];
      setAssignments(all.filter((a) => a.classId === params.classId));
    }
    setLoadingData(false);
  }, [getIdToken, params.classId, router, search]);

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'teacher' || user.role === 'schoolAdmin')) {
      void load();
    }
  }, [isAuthenticated, user, load]);

  if (loading || loadingData) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading class…</p>;
  }

  if (!classDoc) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        Class not found.{' '}
        <Link href="/teacher" className="text-purple-600 hover:underline">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/teacher"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-purple"
      >
        <ArrowLeft className="h-4 w-4" />
        All classes
      </Link>

      <ClassManagement
        classDoc={classDoc}
        students={students}
        onOpenAssignmentCreator={() => setShowAssignmentCreator(true)}
        onOpenHpc={(s) => setHpcStudent(s)}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Assignments in this class</h2>
        {assignments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No assignments yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl border border-gray-100 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500">
                      {a.creationType} · Due {a.dueDate.toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/teacher/classes/${classDoc.id}/assignments/${a.id}?schoolId=${classDoc.schoolId}`}
                    className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100"
                  >
                    {a.submissions} submitted · Review
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showAssignmentCreator && (
        <AssignmentCreator
          classes={[classDoc]}
          defaultClassId={classDoc.id}
          onCreated={(a) => {
            setAssignments((prev) => [a, ...prev]);
            setShowAssignmentCreator(false);
          }}
          onClose={() => setShowAssignmentCreator(false)}
          getIdToken={getIdToken}
        />
      )}

      {hpcStudent && (
        <HPCAssistant
          kidId={hpcStudent.id}
          kidName={hpcStudent.name}
          grade={hpcStudent.grade}
          onClose={() => setHpcStudent(null)}
        />
      )}
    </div>
  );
}
