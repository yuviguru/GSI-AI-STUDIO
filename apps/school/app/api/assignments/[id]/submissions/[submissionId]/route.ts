import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
import { reviewSubmission } from '@gsi/firebase/submissionService';
import { enqueueNotification } from '@/lib/notifications/notificationService';
import type { SubmissionStatus } from '@gsi/types';

const VALID_STATUSES: SubmissionStatus[] = [
  'pending',
  'approved',
  'revision_requested',
];

/**
 * PATCH /api/assignments/[id]/submissions/[submissionId]
 * Teacher review: status / feedback / star.
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: { id: string; submissionId: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    const body = await request.json();

    const updates: {
      status?: SubmissionStatus;
      feedback?: string | null;
      starred?: boolean;
      sharedToClassFeed?: boolean;
    } = {};

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        throw new AppException(
          'INVALID_INPUT',
          `status must be one of ${VALID_STATUSES.join(', ')}`,
          400,
        );
      }
      updates.status = body.status;
    }
    if (body.feedback !== undefined) {
      if (body.feedback !== null && typeof body.feedback !== 'string') {
        throw new AppException('INVALID_INPUT', 'feedback must be a string or null.', 400);
      }
      updates.feedback = body.feedback
        ? (body.feedback as string).trim().slice(0, 2000)
        : null;
    }
    if (body.starred !== undefined) {
      if (typeof body.starred !== 'boolean') {
        throw new AppException('INVALID_INPUT', 'starred must be a boolean.', 400);
      }
      updates.starred = body.starred;
    }
    if (body.sharedToClassFeed !== undefined) {
      if (typeof body.sharedToClassFeed !== 'boolean') {
        throw new AppException(
          'INVALID_INPUT',
          'sharedToClassFeed must be a boolean.',
          400,
        );
      }
      updates.sharedToClassFeed = body.sharedToClassFeed;
    }

    const updated = await reviewSubmission(
      params.submissionId,
      auth.userId,
      auth.schoolId,
      updates,
    );

    // Best-effort: notify the student's parent on status change.
    if (updates.status && updates.status !== 'pending') {
      try {
        const kidSnap = await adminDb.collection('kids').doc(updated.kidId).get();
        const parentId = kidSnap.data()?.parentId as string | null | undefined;
        if (parentId) {
          const body =
            updates.status === 'approved'
              ? 'Your child\'s submission was approved.'
              : 'Your child\'s teacher asked for a revision.';
          await enqueueNotification({
            recipientUid: parentId,
            type: 'submission_reviewed',
            channels: ['in_app'],
            payload: {
              title: 'Assignment reviewed',
              body,
              href: `/parent?assignment=${updated.assignmentId}`,
              context: {
                assignmentId: updated.assignmentId,
                submissionId: updated.id,
                status: updates.status,
              },
            },
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to enqueue review notification:', err);
      }
    }

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
