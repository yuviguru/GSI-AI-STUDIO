'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Users, Calendar, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AssignmentCreator } from '@/components/teacher/AssignmentCreator';
import { cn } from '@/lib/utils';
import type { AssignmentDoc, ClassDoc } from '@/types/user.types';

interface CreateClassInput {
  name: string;
  grade: string;
  section?: string;
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, getIdToken } = useAuth();

  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const [showNewClass, setShowNewClass] = useState(false);
  const [newClass, setNewClass] = useState<CreateClassInput>({ name: '', grade: '5' });
  const [classError, setClassError] = useState<string | null>(null);

  // Redirect unauthenticated or non-teacher users to the teacher login.
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/teacher/login');
      return;
    }
    if (user && user.role !== 'teacher' && user.role !== 'schoolAdmin') {
      router.replace('/teacher/login');
    }
  }, [loading, isAuthenticated, user, router]);

  const loadData = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;

    try {
      // Verify role + discover schoolId
      const verifyRes = await fetch('/api/auth/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!verifyRes.ok) {
        router.replace('/teacher/login');
        return;
      }
      const verifyJson = await verifyRes.json();
      const mySchoolId = verifyJson.data?.schoolId as string | undefined;
      if (!mySchoolId) {
        router.replace('/teacher/login');
        return;
      }

      const [classesRes, assignmentsRes] = await Promise.all([
        fetch(`/api/schools/${mySchoolId}/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/assignments', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const classesJson = await classesRes.json();
      const assignmentsJson = await assignmentsRes.json();
      if (classesRes.ok) setClasses(classesJson.data?.classes ?? []);
      if (assignmentsRes.ok)
        setAssignments(assignmentsJson.data?.assignments ?? []);
    } finally {
      setLoadingData(false);
    }
    // schoolId effectively captured via closure
  }, [getIdToken, router]);

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'teacher' || user.role === 'schoolAdmin')) {
      void loadData();
    }
  }, [isAuthenticated, user, loadData]);

  async function handleCreateClass() {
    setClassError(null);
    const token = await getIdToken();
    if (!token) return;

    // Re-verify to get schoolId
    const verifyRes = await fetch('/api/auth/teacher', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const verifyJson = await verifyRes.json();
    const mySchoolId = verifyJson.data?.schoolId as string | undefined;
    if (!mySchoolId) {
      setClassError('School not detected.');
      return;
    }

    const res = await fetch(`/api/schools/${mySchoolId}/classes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newClass),
    });
    const json = await res.json();
    if (!res.ok) {
      setClassError(json.error?.message ?? 'Could not create class.');
      return;
    }
    setClasses((prev) => [...prev, json.data as ClassDoc]);
    setShowNewClass(false);
    setNewClass({ name: '', grade: '5' });
  }

  if (loading || loadingData) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading…</p>;
  }

  const totalStudents = classes.reduce((sum, c) => sum + c.studentKidIds.length, 0);
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const submissionsThisWeek = assignments.filter(
    (a) => a.updatedAt.getTime() >= oneWeekAgo,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            {user?.name ? `Welcome, ${user.name}` : 'Teacher dashboard'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {user?.role === 'schoolAdmin' ? 'School admin' : 'Teacher'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewClass(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
          >
            <Plus className="h-4 w-4" />
            New class
          </button>
          <button
            onClick={() => setShowAssignmentCreator(true)}
            disabled={classes.length === 0}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm',
              classes.length === 0 ? 'bg-gray-300' : 'bg-purple-600 hover:bg-purple-700',
            )}
          >
            <Plus className="h-4 w-4" />
            Create assignment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Students" value={totalStudents} />
        <StatCard icon={BookOpen} label="Classes" value={classes.length} />
        <StatCard icon={Calendar} label="Assignments" value={assignments.length} />
        <StatCard
          icon={Calendar}
          label="Activity this week"
          value={submissionsThisWeek}
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Your classes</h2>
        {classes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              No classes yet — create one to start inviting students.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Link
                key={c.id}
                href={`/teacher/classes/${c.id}?schoolId=${c.schoolId}`}
                className="rounded-2xl border border-gray-100 bg-white p-4 transition hover:border-purple-200 hover:shadow-sm"
              >
                <p className="font-semibold text-gray-900">{c.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Grade {c.grade}
                  {c.section ? ` · ${c.section}` : ''}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Users className="h-3.5 w-3.5" />
                    {c.studentKidIds.length} students
                  </span>
                  <code className="rounded bg-purple-50 px-2 py-0.5 font-mono text-xs text-purple-600">
                    {c.inviteCode}
                  </code>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Recent assignments</h2>
        {assignments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No assignments yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {assignments.slice(0, 8).map((a) => {
              const classData = classes.find((c) => c.id === a.classId);
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500">
                      {classData?.name ?? 'Class'} · {a.creationType} · Due{' '}
                      {a.dueDate.toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    {a.submissions} submitted
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showNewClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">New class</h3>
            <div className="mt-4 space-y-3">
              <input
                value={newClass.name}
                onChange={(e) => setNewClass((c) => ({ ...c, name: e.target.value }))}
                placeholder="Class 5A"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newClass.grade}
                  onChange={(e) => setNewClass((c) => ({ ...c, grade: e.target.value }))}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                >
                  {['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
                <input
                  value={newClass.section ?? ''}
                  onChange={(e) =>
                    setNewClass((c) => ({ ...c, section: e.target.value.toUpperCase() }))
                  }
                  placeholder="Section (opt)"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm uppercase focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
              </div>
              {classError && (
                <p className="rounded-xl bg-red-50 p-2 text-xs text-red-600">{classError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewClass(false)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateClass}
                  className="rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignmentCreator && (
        <AssignmentCreator
          classes={classes}
          onCreated={(a) => {
            setAssignments((prev) => [a, ...prev]);
            setShowAssignmentCreator(false);
          }}
          onClose={() => setShowAssignmentCreator(false)}
          getIdToken={getIdToken}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
