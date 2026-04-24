/**
 * GET /api/admin/compliance/dpdp-snapshot — JSON of the v2 DPDP sections
 * for the DPO dashboard. schoolAdmin only.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import {
  getConsentSnapshotForSchool,
  getTeacherAiUsageRollup,
  listErasureRequestsForSchool,
} from '@/lib/firebase/complianceQueryService';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'No school attached.', 403);
    }
    const [consentSnapshot, teacherAiUsage, erasureRequests] = await Promise.all([
      getConsentSnapshotForSchool(auth.schoolId),
      getTeacherAiUsageRollup(auth.schoolId),
      listErasureRequestsForSchool(auth.schoolId),
    ]);
    return apiSuccess({ consentSnapshot, teacherAiUsage, erasureRequests });
  } catch (error) {
    return handleApiError(error);
  }
}
