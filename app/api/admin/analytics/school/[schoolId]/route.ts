import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  getCachedAnalytics,
  refreshSchoolAnalytics,
} from '@gsi/firebase/analyticsService';

/**
 * GET /api/admin/analytics/school/[schoolId]
 * School-level analytics. Returns the cached doc; `?refresh=1` forces a
 * re-aggregation (expensive — use sparingly).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { schoolId: string } },
) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    if (auth.schoolId !== params.schoolId) {
      throw new AppException(
        'FORBIDDEN',
        'You can only view your own school\'s analytics.',
        403,
      );
    }

    const url = new URL(request.url);
    const shouldRefresh = url.searchParams.get('refresh') === '1';

    let analytics = await getCachedAnalytics(params.schoolId);
    if (!analytics || shouldRefresh) {
      analytics = await refreshSchoolAnalytics(params.schoolId);
    }

    return apiSuccess({ analytics });
  } catch (error) {
    return handleApiError(error);
  }
}
