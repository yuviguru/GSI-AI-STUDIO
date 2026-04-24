import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth, requireRole } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import {
  createAssignment,
  getClass,
  listAssignmentsForTeacher,
  listAssignmentsForKid,
} from '@/lib/firebase/schoolService';
import { getConcept } from '@/lib/curriculum/curriculumMap';
import { enqueueNotificationBatch } from '@/lib/notifications/notificationService';
import type { CreationType } from '@/types/creation.types';

async function notifyParentsOfNewAssignment(
  classStudentKidIds: string[],
  assignment: {
    id: string;
    classId: string;
    title: string;
    creationType: CreationType;
    dueDate: Date;
  },
): Promise<void> {
  if (classStudentKidIds.length === 0) return;
  const kidSnaps = await Promise.all(
    classStudentKidIds.map((kidId) => adminDb.collection('kids').doc(kidId).get()),
  );
  const parentUids = new Set<string>();
  for (const snap of kidSnaps) {
    const parentId = snap.data()?.parentId as string | null | undefined;
    if (parentId) parentUids.add(parentId);
  }
  if (parentUids.size === 0) return;

  const dueLabel = assignment.dueDate.toLocaleDateString();
  await enqueueNotificationBatch(
    Array.from(parentUids).map((uid) => ({
      recipientUid: uid,
      type: 'assignment_new' as const,
      channels: ['in_app' as const],
      payload: {
        title: `New ${assignment.creationType} assignment`,
        body: `"${assignment.title}" — due ${dueLabel}`,
        href: `/parent?assignment=${assignment.id}`,
        context: {
          assignmentId: assignment.id,
          classId: assignment.classId,
          creationType: assignment.creationType,
        },
      },
    })),
  );
}

const VALID_CREATION_TYPES: CreationType[] = [
  'story',
  'music',
  'quiz',
  'game',
  'comic',
];

/**
 * POST /api/assignments
 * Create an assignment. Teacher/schoolAdmin only.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);

    const body = await request.json();
    const classId: unknown = body?.classId;
    const title: unknown = body?.title;
    const description: unknown = body?.description;
    const creationType: unknown = body?.creationType;
    const dueDateRaw: unknown = body?.dueDate;
    const curriculumTagsRaw: unknown = body?.curriculumTags;
    const templateId: unknown = body?.templateId;

    if (typeof classId !== 'string' || classId.length < 1) {
      throw new AppException('INVALID_INPUT', 'classId is required.', 400);
    }
    if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 120) {
      throw new AppException('INVALID_INPUT', 'Title is required (1-120 chars).', 400);
    }
    if (
      typeof description !== 'string' ||
      description.trim().length < 1 ||
      description.length > 2000
    ) {
      throw new AppException(
        'INVALID_INPUT',
        'Description is required (up to 2000 chars).',
        400,
      );
    }
    if (
      typeof creationType !== 'string' ||
      !VALID_CREATION_TYPES.includes(creationType as CreationType)
    ) {
      throw new AppException(
        'INVALID_INPUT',
        'creationType must be story | music | quiz | game | comic.',
        400,
      );
    }
    if (typeof dueDateRaw !== 'string' && typeof dueDateRaw !== 'number') {
      throw new AppException('INVALID_INPUT', 'dueDate is required (ISO date).', 400);
    }
    const dueDate = new Date(dueDateRaw);
    if (Number.isNaN(dueDate.getTime())) {
      throw new AppException('INVALID_INPUT', 'dueDate must be a valid date.', 400);
    }

    const curriculumTags: string[] = Array.isArray(curriculumTagsRaw)
      ? (curriculumTagsRaw.filter((t) => typeof t === 'string') as string[])
      : [];
    // Silently drop tags that don't exist in the map — doesn't fail the request.
    const validTags = curriculumTags.filter((id) => getConcept(id) !== null);

    if (!auth.schoolId) {
      throw new AppException(
        'FORBIDDEN',
        'Teachers must be attached to a school to create assignments.',
        403,
      );
    }

    const cls = await getClass(auth.schoolId, classId);
    if (!cls) {
      throw new AppException('NOT_FOUND', 'Class not found in your school.', 404);
    }
    if (auth.role === 'teacher' && cls.teacherUid !== auth.userId) {
      throw new AppException(
        'FORBIDDEN',
        'You can only assign work to your own classes.',
        403,
      );
    }

    const assignment = await createAssignment({
      schoolId: auth.schoolId,
      classId,
      teacherUid: auth.userId,
      title: title.trim(),
      description: description.trim(),
      creationType: creationType as CreationType,
      dueDate,
      curriculumTags: validTags,
      templateId: typeof templateId === 'string' ? templateId : undefined,
    });

    // Best-effort: notify parents of students in the class. A failure here
    // must not roll back the created assignment.
    try {
      await notifyParentsOfNewAssignment(cls.studentKidIds, {
        id: assignment.id,
        classId: assignment.classId,
        title: assignment.title,
        creationType: assignment.creationType,
        dueDate: assignment.dueDate,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to enqueue assignment notifications:', err);
    }

    return apiSuccess(assignment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/assignments
 * - Teacher: all assignments across their classes.
 * - Parent: `X-Active-Kid-Id` required; returns assignments for the kid's
 *   classes with submissionStatus per assignment.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    if (auth.role === 'teacher' || auth.role === 'schoolAdmin') {
      const assignments = await listAssignmentsForTeacher(auth.userId);
      return apiSuccess({ assignments });
    }

    // Parent → need active kid
    const kidId = request.headers.get('X-Active-Kid-Id');
    if (!kidId) {
      throw new AppException(
        'KID_REQUIRED',
        'Pick a kid profile to see their assignments.',
        400,
      );
    }
    const kidDoc = await adminDb.collection('kids').doc(kidId).get();
    if (!kidDoc.exists || kidDoc.data()?.parentId !== auth.userId) {
      throw new AppException('FORBIDDEN', 'That kid is not yours.', 403);
    }

    const assignments = await listAssignmentsForKid(kidId);
    if (assignments.length === 0) {
      return apiSuccess({ assignments: [] });
    }

    // Attach per-assignment submission status for the kid.
    const submissionsSnap = await adminDb
      .collection('submissions')
      .where('kidId', '==', kidId)
      .get();
    const statusByAssignment = new Map<
      string,
      { status: string; creationId: string }
    >();
    for (const doc of submissionsSnap.docs) {
      const data = doc.data();
      statusByAssignment.set(data.assignmentId, {
        status: data.status,
        creationId: data.creationId,
      });
    }

    const now = Date.now();
    const enriched = assignments.map((a) => {
      const sub = statusByAssignment.get(a.id);
      let derivedStatus: string;
      if (sub) {
        derivedStatus = sub.status; // pending / approved / revision_requested
      } else if (a.dueDate.getTime() < now) {
        derivedStatus = 'late';
      } else {
        derivedStatus = 'not_started';
      }
      return {
        ...a,
        submissionStatus: derivedStatus,
        submittedCreationId: sub?.creationId,
      };
    });
    return apiSuccess({ assignments: enriched });
  } catch (error) {
    return handleApiError(error);
  }
}
