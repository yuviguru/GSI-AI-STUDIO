import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { reviewSubmission } from '@/lib/firebase/submissionService';
import type { SubmissionStatus } from '@/types/user.types';

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

    const updated = await reviewSubmission(
      params.submissionId,
      auth.userId,
      auth.schoolId,
      updates,
    );
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
