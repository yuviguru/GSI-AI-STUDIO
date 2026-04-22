import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  getSchool,
  updateSchool,
  setSchoolPlan,
  type UpdateSchoolInput,
} from '@/lib/firebase/schoolService';
import { invalidateSchoolBranding } from '@/lib/pdf/schoolBranding';
import type { Board, SchoolPlan } from '@/types/user.types';

function assertSchoolAccess(schoolId: string, authSchoolId?: string) {
  if (!authSchoolId || authSchoolId !== schoolId) {
    throw new AppException(
      'FORBIDDEN',
      'You can only manage your own school.',
      403,
    );
  }
}

/** GET /api/schools/[id] — fetch school for display in settings. */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    assertSchoolAccess(params.id, auth.schoolId);

    const school = await getSchool(params.id);
    if (!school) {
      throw new AppException('NOT_FOUND', 'School not found.', 404);
    }
    return apiSuccess(school);
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/schools/[id] — update metadata and/or plan. schoolAdmin only. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    assertSchoolAccess(params.id, auth.schoolId);

    const body = (await request.json()) as Record<string, unknown>;

    const updates: UpdateSchoolInput = {};
    if (typeof body.name === 'string') updates.name = body.name;
    if (typeof body.city === 'string') updates.city = body.city;
    if (typeof body.state === 'string') updates.state = body.state;
    if (typeof body.board === 'string') updates.board = body.board as Board;

    let school = await updateSchool(params.id, updates, auth.userId);

    if (typeof body.plan === 'string') {
      school = await setSchoolPlan(params.id, body.plan as SchoolPlan, auth.userId);
    }

    invalidateSchoolBranding(params.id);
    return apiSuccess(school);
  } catch (error) {
    return handleApiError(error);
  }
}
