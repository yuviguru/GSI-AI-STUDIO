'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneAuthFlow } from '@/components/auth/PhoneAuthFlow';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Board } from '@gsi/types';

type Stage = 'phone' | 'school' | 'done';

interface SchoolMeta {
  name: string;
  city: string;
  state: string;
  board: Board;
}

export function TeacherSignupFlow() {
  const router = useRouter();
  const { isAuthenticated, user, getIdToken, refreshProfile } = useAuth();

  const [stage, setStage] = useState<Stage>('phone');
  const [schoolCode, setSchoolCode] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [needsSchoolMeta, setNeedsSchoolMeta] = useState(false);
  const [meta, setMeta] = useState<SchoolMeta>({
    name: '',
    city: '',
    state: '',
    board: 'cbse',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stage === 'phone' && isAuthenticated) {
      setStage('school');
    }
  }, [isAuthenticated, stage]);

  // If we come back and the user already has teacher role, jump to /teacher.
  useEffect(() => {
    if (user?.role === 'teacher' || user?.role === 'schoolAdmin') {
      router.replace('/teacher');
    }
  }, [user, router]);

  async function submit() {
    setError(null);
    if (schoolCode.trim().length < 3) {
      setError('Enter the school code your principal shared with you.');
      return;
    }
    if (teacherName.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Auth token unavailable.');

      const body: Record<string, unknown> = {
        schoolCode: schoolCode.trim().toUpperCase(),
        name: teacherName.trim(),
      };
      if (needsSchoolMeta) {
        if (!meta.name.trim() || !meta.city.trim() || !meta.state.trim()) {
          throw new Error('Fill in the school name, city, and state.');
        }
        body.school = meta;
      }

      const res = await fetch('/api/auth/teacher', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        // Server tells us we need to bootstrap the school
        if (
          json.error?.code === 'INVALID_INPUT' &&
          /register a new school/i.test(json.error.message) &&
          !needsSchoolMeta
        ) {
          setNeedsSchoolMeta(true);
          throw new Error('New school — please enter its details below.');
        }
        throw new Error(json.error?.message ?? 'Registration failed.');
      }

      await refreshProfile();
      setStage('done');
      setTimeout(() => router.push('/teacher'), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === 'phone') {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-4 shadow-sm">
        <PhoneAuthFlow onComplete={() => setStage('school')} />
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <span className="text-5xl">🎓</span>
        <h2 className="mt-3 text-xl font-bold text-gray-900">You&apos;re set!</h2>
        <p className="mt-2 text-sm text-gray-500">Taking you to your teacher dashboard…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Teacher setup</h2>
      <p className="mt-1 text-sm text-gray-500">
        Enter your school code and name to activate your teacher dashboard.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Your name
          <input
            type="text"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            placeholder="Ms. Priya Sharma"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          School code
          <input
            type="text"
            value={schoolCode}
            onChange={(e) => setSchoolCode(e.target.value.toUpperCase().slice(0, 20))}
            placeholder="DPS-DEL-042"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono uppercase focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
          <span className="mt-1 block text-xs text-gray-400">
            Ask your principal or IT admin. If your school isn&apos;t registered yet,
            we&apos;ll help you add it.
          </span>
        </label>

        {needsSchoolMeta && (
          <div className="space-y-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-3">
            <p className="text-xs font-semibold text-purple-700">
              New school — tell us a bit about it (you&apos;ll be the first admin).
            </p>
            <input
              type="text"
              value={meta.name}
              onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
              placeholder="School name"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={meta.city}
                onChange={(e) => setMeta((m) => ({ ...m, city: e.target.value }))}
                placeholder="City"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
              <input
                type="text"
                value={meta.state}
                onChange={(e) => setMeta((m) => ({ ...m, state: e.target.value }))}
                placeholder="State"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>
            <select
              value={meta.board}
              onChange={(e) => setMeta((m) => ({ ...m, board: e.target.value as Board }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            >
              <option value="cbse">CBSE</option>
              <option value="icse">ICSE</option>
              <option value="state">State board</option>
            </select>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className={cn(
            'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]',
            submitting ? 'bg-gray-300' : 'bg-purple-600 hover:bg-purple-700',
          )}
        >
          {submitting ? 'Setting up…' : 'Continue to dashboard'}
        </button>
      </div>
    </div>
  );
}
