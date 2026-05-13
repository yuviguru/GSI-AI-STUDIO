'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from './useAuth';
import { useKidProfile } from './useKidProfile';
import { fetchWithKidAuth } from '@/lib/fetchWithKidAuth';
import type { AssignmentDoc } from '@gsi/types';
import type { CreationType } from '@gsi/types';

type AssignmentDetail = Omit<AssignmentDoc, 'dueDate' | 'createdAt' | 'updatedAt'> & {
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

interface AssignmentContextState {
  assignmentId: string | null;
  assignment: AssignmentDetail | null;
  loading: boolean;
  error: string | null;
  submitted: boolean;
  submittedAt?: Date;
  /**
   * Call with the new creation's ID as soon as it is saved to Firestore.
   * Fires at most once per mount; safe to call multiple times.
   */
  submit: (creationId: string) => Promise<void>;
  /**
   * True if the studio page is being used in an assignment context that
   * matches the given creation type. Used by studio clients to decide
   * whether to lock the creation-type picker.
   */
  isLockedTo: (type: CreationType) => boolean;
}

export function useAssignmentContext(): AssignmentContextState {
  const search = useSearchParams();
  const assignmentId = search.get('assignmentId');
  const { isAuthenticated, getIdToken } = useAuth();
  const { activeKid } = useKidProfile();

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(!!assignmentId);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | undefined>();
  const submitOnceRef = useRef(false);

  useEffect(() => {
    if (!assignmentId || !isAuthenticated || !activeKid) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetchWithKidAuth(`/api/assignments/${assignmentId}`, {
          getIdToken,
          kidId: activeKid.id,
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error?.message ?? 'Could not load assignment.');
        }
        const json = await res.json();
        const a = json.data?.assignment;
        if (a) {
          setAssignment({
            ...a,
            dueDate: new Date(a.dueDate),
            createdAt: new Date(a.createdAt),
            updatedAt: new Date(a.updatedAt),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load assignment.');
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId, isAuthenticated, activeKid, getIdToken]);

  const submit = useCallback(
    async (creationId: string) => {
      if (!assignmentId || !activeKid) return;
      if (submitOnceRef.current) return;
      submitOnceRef.current = true;
      try {
        const res = await fetchWithKidAuth(
          `/api/assignments/${assignmentId}/submissions`,
          { getIdToken, kidId: activeKid.id },
          {
            method: 'POST',
            body: JSON.stringify({ creationId }),
          },
        );
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error?.message ?? 'Submission failed.');
        }
        setSubmitted(true);
        setSubmittedAt(new Date());
      } catch (err) {
        submitOnceRef.current = false; // allow retry on error
        setError(err instanceof Error ? err.message : 'Submission failed.');
      }
    },
    [assignmentId, activeKid, getIdToken],
  );

  const isLockedTo = useCallback(
    (type: CreationType) => {
      return !!assignment && assignment.creationType === type;
    },
    [assignment],
  );

  return {
    assignmentId,
    assignment,
    loading,
    error,
    submitted,
    submittedAt,
    submit,
    isLockedTo,
  };
}
