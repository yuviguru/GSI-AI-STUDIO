import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import {
  verifyAuth,
  requireRole,
  requireAuthWithKid,
} from '@/lib/auth-utils';
import {
  submitCreation,
  listSubmissionsWithContext,
  bulkApprovePending,
} from '@/lib/firebase/submissionService';
import { getAssignment } from '@/lib/firebase/schoolService';

/**
 * POST /api/assignments/[id]/submissions
 * Parent (on behalf of their active kid) submits a creation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuthWithKid(request);
    const body = await request.json();
    const creationId: unknown = body?.creationId;
    if (typeof creationId !== 'string' || creationId.trim().length < 1) {
      throw new AppException('INVALID_INPUT', 'creationId is required.', 400);
    }

    const submission = await submitCreation({
      assignmentId: params.id,
      kidId: auth.kidId,
      creationId: creationId.trim(),
    });
    return apiSuccess(submission, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/assignments/[id]/submissions
 * Teacher-only submission grid with kid + creation context.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    const assignment = await getAssignment(params.id);
    if (!assignment) {
      throw new AppException('NOT_FOUND', 'Assignment not found.', 404);
    }
    if (assignment.schoolId !== auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Not your school.', 403);
    }
    if (auth.role === 'teacher' && assignment.teacherUid !== auth.userId) {
      throw new AppException(
        'FORBIDDEN',
        'Only the assigning teacher or a school admin can review submissions.',
        403,
      );
    }

    const submissions = await listSubmissionsWithContext(params.id);
    return apiSuccess({ submissions, assignment });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/assignments/[id]/submissions
 * Teacher bulk-approve all pending submissions.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    const body = await request.json();
    if (body?.action !== 'bulk_approve_pending') {
      throw new AppException(
        'INVALID_INPUT',
        'Only action "bulk_approve_pending" is supported here.',
        400,
      );
    }
    const count = await bulkApprovePending(params.id, auth.userId, auth.schoolId);
    return apiSuccess({ approved: count });
  } catch (error) {
    return handleApiError(error);
  }
}
