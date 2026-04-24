import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import '@/lib/integrations';
import { resolveProvider } from '@/lib/integrations/schoolDataProvider';

/** POST /api/integrations/erp/test — runs provider.healthCheck(). */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'You are not attached to a school.', 403);
    }
    const provider = await resolveProvider(auth.schoolId);
    const health = await provider.healthCheck();
    return apiSuccess({ health });
  } catch (error) {
    return handleApiError(error);
  }
}
