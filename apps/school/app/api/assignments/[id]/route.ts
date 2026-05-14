import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth, requireRole } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
import {
  getAssignment,
  getClass,
  updateAssignment,
} from '@gsi/firebase/schoolService';

/**
 * GET /api/assignments/[id]
 * Returns assignment detail. Teachers also get submission summary counts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await verifyAuth(request);
    const assignment = await getAssignment(params.id);
    if (!assignment) {
      throw new AppException('NOT_FOUND', 'Assignment not found.', 404);
    }

    // Authorization:
    // - Teacher in the same school: can view.
    // - Parent with active kid enrolled in the class: can view.
    if (auth.role === 'teacher' || auth.role === 'schoolAdmin') {
      if (auth.schoolId !== assignment.schoolId) {
        throw new AppException('FORBIDDEN', 'Not your school.', 403);
      }

      const submissionsSnap = await adminDb
        .collection('submissions')
        .where('assignmentId', '==', assignment.id)
        .get();

      const byStatus = { pending: 0, approved: 0, revision_requested: 0 };
      submissionsSnap.docs.forEach((d) => {
        const s = d.data().status as keyof typeof byStatus;
        if (byStatus[s] !== undefined) byStatus[s] += 1;
      });

      return apiSuccess({
        assignment,
        submissionStats: {
          total: submissionsSnap.size,
          ...byStatus,
        },
      });
    }

    // Parent path — must supply active kid and that kid must be in the class
    const kidId = request.headers.get('X-Active-Kid-Id');
    if (!kidId) {
      throw new AppException('KID_REQUIRED', 'Pick a kid profile first.', 400);
    }
    const kidDoc = await adminDb.collection('kids').doc(kidId).get();
    if (!kidDoc.exists || kidDoc.data()?.parentId !== auth.userId) {
      throw new AppException('FORBIDDEN', 'That kid is not yours.', 403);
    }
    const classIds: string[] = kidDoc.data()?.classIds ?? [];
    if (!classIds.includes(assignment.classId)) {
      throw new AppException(
        'FORBIDDEN',
        'Kid is not enrolled in this assignment\'s class.',
        403,
      );
    }

    // Resolve the kid's own submission (if any)
    const subSnap = await adminDb
      .collection('submissions')
      .where('assignmentId', '==', assignment.id)
      .where('kidId', '==', kidId)
      .limit(1)
      .get();

    const cls = await getClass(assignment.schoolId, assignment.classId);

    return apiSuccess({
      assignment,
      className: cls?.name,
      submission: subSnap.empty ? null : subSnap.docs[0]!.data(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/assignments/[id]
 * Teacher updates: extend dueDate, edit description, flip status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    const body = await request.json();

    const updates: Parameters<typeof updateAssignment>[2] = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length < 1) {
        throw new AppException('INVALID_INPUT', 'Title must be non-empty.', 400);
      }
      updates.title = body.title.trim().slice(0, 120);
    }
    if (body.description !== undefined) {
      if (typeof body.description !== 'string') {
        throw new AppException('INVALID_INPUT', 'Description must be a string.', 400);
      }
      updates.description = body.description.trim().slice(0, 2000);
    }
    if (body.dueDate !== undefined) {
      const d = new Date(body.dueDate);
      if (Number.isNaN(d.getTime())) {
        throw new AppException('INVALID_INPUT', 'dueDate must be valid.', 400);
      }
      updates.dueDate = d;
    }
    if (body.curriculumTags !== undefined) {
      if (!Array.isArray(body.curriculumTags)) {
        throw new AppException(
          'INVALID_INPUT',
          'curriculumTags must be an array of strings.',
          400,
        );
      }
      updates.curriculumTags = body.curriculumTags.filter(
        (t: unknown) => typeof t === 'string',
      );
    }
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'closed') {
        throw new AppException(
          'INVALID_INPUT',
          'status must be active or closed.',
          400,
        );
      }
      updates.status = body.status;
    }

    const updated = await updateAssignment(params.id, auth.userId, updates);
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
