'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { fetchWithKidAuth } from '@/lib/fetchWithKidAuth';
import { useAuth } from '@/hooks/useAuth';
import { useKidProfile } from '@/hooks/useKidProfile';
import { cn } from '@/lib/utils';
import type { AssignmentDoc } from '@gsi/types';

type StudentStatus = 'not_started' | 'pending' | 'approved' | 'revision_requested' | 'late';

interface EnrichedAssignment extends AssignmentDoc {
  submissionStatus: StudentStatus;
  submittedCreationId?: string;
}

const STUDIO_PATH: Record<AssignmentDoc['creationType'], string> = {
  story: '/create/story',
  music: '/create/music',
  quiz: '/create/quiz',
  game: '/create/game',
  comic: '/create/comic',
};

const STATUS_META: Record<StudentStatus, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  not_started: { label: 'Start', icon: ArrowRight, tone: 'bg-purple-50 text-purple-700' },
  pending: { label: 'Submitted', icon: Clock, tone: 'bg-blue-50 text-blue-700' },
  approved: { label: 'Approved', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
  revision_requested: {
    label: 'Revise',
    icon: AlertTriangle,
    tone: 'bg-amber-50 text-amber-700',
  },
  late: { label: 'Overdue', icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700' },
};

/**
 * Student-facing list of pending / recent assignments. Rendered on the
 * kid dashboard. Clicking "Start" routes into the correct studio with the
 * assignmentId query param so the studio client can auto-submit on publish.
 */
export function AssignmentView() {
  const { getIdToken, isAuthenticated } = useAuth();
  const { activeKid } = useKidProfile();
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !activeKid) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetchWithKidAuth('/api/assignments', {
          getIdToken,
          kidId: activeKid.id,
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          if (json.error?.code === 'KID_REQUIRED' || json.error?.code === 'FORBIDDEN') {
            setAssignments([]);
            return;
          }
          throw new Error(json.error?.message ?? 'Could not load assignments.');
        }
        const json = await res.json();
        const raw = (json.data?.assignments ?? []) as (EnrichedAssignment & {
          dueDate: string | Date;
          createdAt: string | Date;
          updatedAt: string | Date;
        })[];
        const parsed = raw.map((a) => ({
          ...a,
          dueDate: new Date(a.dueDate),
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt),
        }));
        setAssignments(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, activeKid, getIdToken]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-400">
        Checking for assignments…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
    );
  }

  if (assignments.length === 0) return null;

  return (
    <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4">
      <h3 className="font-display text-base font-bold text-gray-900">From your teacher</h3>
      <p className="mt-0.5 text-xs text-gray-500">
        {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'} waiting
      </p>
      <ul className="mt-3 space-y-2">
        {assignments.map((a) => {
          const meta = STATUS_META[a.submissionStatus];
          const Icon = meta.icon;
          const studioHref = `${STUDIO_PATH[a.creationType]}?assignmentId=${a.id}`;
          const canAct =
            a.submissionStatus === 'not_started' ||
            a.submissionStatus === 'revision_requested' ||
            a.submissionStatus === 'late';

          return (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{a.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  Due {a.dueDate.toLocaleDateString()} · {a.creationType}
                </p>
              </div>
              {canAct ? (
                <Link
                  href={studioHref}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold',
                    meta.tone,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold',
                    meta.tone,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
