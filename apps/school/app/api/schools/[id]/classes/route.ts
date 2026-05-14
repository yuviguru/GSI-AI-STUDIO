import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  createClass,
  listClassesForSchool,
  getSchool,
} from '@gsi/firebase/schoolService';

const VALID_GRADES = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function assertSchoolAccess(schoolId: string, authSchoolId?: string) {
  if (!authSchoolId || authSchoolId !== schoolId) {
    throw new AppException(
      'FORBIDDEN',
      'You can only manage classes in your own school.',
      403,
    );
  }
}

/**
 * POST /api/schools/[id]/classes
 * Create a class in the teacher's school.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    assertSchoolAccess(params.id, auth.schoolId);

    const body = await request.json();
    const name: unknown = body?.name;
    const grade: unknown = body?.grade;
    const section: unknown = body?.section;

    if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 60) {
      throw new AppException('INVALID_INPUT', 'Class name is required (1-60 chars).', 400);
    }
    if (typeof grade !== 'string' || !VALID_GRADES.includes(grade)) {
      throw new AppException('INVALID_INPUT', 'Grade must be between 3 and 12.', 400);
    }
    let sectionValue: string | undefined;
    if (section !== undefined && section !== null && section !== '') {
      if (typeof section !== 'string' || section.length > 6) {
        throw new AppException('INVALID_INPUT', 'Section must be a short string.', 400);
      }
      sectionValue = section.trim().toUpperCase();
    }

    const school = await getSchool(params.id);
    if (!school) {
      throw new AppException('NOT_FOUND', 'School not found.', 404);
    }

    const cls = await createClass({
      schoolId: params.id,
      name: name.trim(),
      grade,
      section: sectionValue,
      teacherUid: auth.userId,
    });

    return apiSuccess(cls, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/schools/[id]/classes
 * List classes in the teacher's school.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    assertSchoolAccess(params.id, auth.schoolId);

    const classes = await listClassesForSchool(params.id);
    return apiSuccess({ classes });
  } catch (error) {
    return handleApiError(error);
  }
}
