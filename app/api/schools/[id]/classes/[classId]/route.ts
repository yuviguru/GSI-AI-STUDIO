import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { getClass, getClassStudents } from '@/lib/firebase/schoolService';

/**
 * GET /api/schools/[id]/classes/[classId]
 * Class detail with student roster.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; classId: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (auth.schoolId !== params.id) {
      throw new AppException('FORBIDDEN', 'Class is not in your school.', 403);
    }

    const cls = await getClass(params.id, params.classId);
    if (!cls) {
      throw new AppException('NOT_FOUND', 'Class not found.', 404);
    }
    if (auth.role === 'teacher' && cls.teacherUid !== auth.userId) {
      throw new AppException(
        'FORBIDDEN',
        'You can only view your own classes.',
        403,
      );
    }

    const students = await getClassStudents(params.id, params.classId);
    return apiSuccess({ class: cls, students });
  } catch (error) {
    return handleApiError(error);
  }
}
