import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { updateSchoolBranding } from '@gsi/firebase/schoolService';
import { invalidateSchoolBranding } from '@/lib/pdf/schoolBranding';

function assertSchoolAccess(schoolId: string, authSchoolId?: string) {
  if (!authSchoolId || authSchoolId !== schoolId) {
    throw new AppException(
      'FORBIDDEN',
      'You can only manage your own school.',
      403,
    );
  }
}

/** PATCH /api/schools/[id]/branding — update branding colors. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    assertSchoolAccess(params.id, auth.schoolId);

    const body = (await request.json()) as Record<string, unknown>;
    const updates: { primaryColor?: string; secondaryColor?: string } = {};
    if (typeof body.primaryColor === 'string') updates.primaryColor = body.primaryColor;
    if (typeof body.secondaryColor === 'string') updates.secondaryColor = body.secondaryColor;

    const school = await updateSchoolBranding(params.id, updates, auth.userId);
    invalidateSchoolBranding(params.id);
    return apiSuccess(school);
  } catch (error) {
    return handleApiError(error);
  }
}
