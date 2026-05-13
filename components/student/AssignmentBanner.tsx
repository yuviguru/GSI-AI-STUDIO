'use client';

import { useEffect } from 'react';
import { GraduationCap, CheckCircle2 } from 'lucide-react';
import { useAssignmentContext } from '@/hooks/useAssignmentContext';
import type { CreationType } from '@gsi/types';

interface Props {
  /** The current studio's creation type — used as a guard for auto-submit. */
  creationType: CreationType;
  /** Firestore creation ID after the kid publishes; triggers auto-submit. */
  creationId?: string | null;
}

/**
 * Renders a compact banner at the top of a studio when the kid is creating
 * for a teacher assignment (`?assignmentId=`). Once the creation is saved
 * (creationId becomes truthy) the banner auto-submits it to the assignment
 * and flips to a success state.
 */
export function AssignmentBanner({ creationType, creationId }: Props) {
  const ctx = useAssignmentContext();

  useEffect(() => {
    if (
      ctx.assignment &&
      ctx.assignment.creationType === creationType &&
      creationId &&
      !ctx.submitted
    ) {
      void ctx.submit(creationId);
    }
  }, [ctx, creationId, creationType]);

  if (!ctx.assignmentId) return null;
  if (ctx.loading) {
    return (
      <div className="mb-4 rounded-2xl border border-purple-100 bg-purple-50/40 px-4 py-3 text-sm text-purple-600">
        Loading your assignment…
      </div>
    );
  }

  if (ctx.error || !ctx.assignment) {
    return (
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Assignment link could not be opened.{' '}
        {ctx.error ? <span className="text-xs text-amber-500">({ctx.error})</span> : null}
      </div>
    );
  }

  const mismatch = ctx.assignment.creationType !== creationType;

  return (
    <div className="mb-4 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
            Assignment from your teacher
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-gray-900">
            {ctx.assignment.title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-gray-600">
            {ctx.assignment.description}
          </p>
          {mismatch && (
            <p className="mt-1 text-xs text-amber-600">
              Heads up: this assignment asks for a{' '}
              <span className="font-semibold">{ctx.assignment.creationType}</span>, not a{' '}
              {creationType}.
            </p>
          )}
          {ctx.submitted && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Submitted to assignment!
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Due</p>
          <p className="text-xs font-medium text-gray-600">
            {ctx.assignment.dueDate.toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
