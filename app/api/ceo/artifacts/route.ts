import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { getCeoBusiness } from '@/lib/firebase/ceoService';
import { listArtifactsForBusiness } from '@/lib/firebase/ceoArtifactService';
import type { CeoArtifactStatus } from '@/types';

const VALID_STATUSES: CeoArtifactStatus[] = ['candidate', 'accepted', 'rejected', 'expired'];

/**
 * GET /api/ceo/artifacts?businessId=...&status=accepted
 *
 * Paginated artifact feed. Used by the Team tab's recent-artifacts view
 * and, after business completion, by the export flow.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const url = new URL(request.url);
    const businessId = url.searchParams.get('businessId');
    const rawStatus = url.searchParams.get('status');
    const limitRaw = url.searchParams.get('limit');

    if (!businessId) {
      throw new AppException('INVALID_INPUT', 'businessId query param is required', 400);
    }

    const business = await getCeoBusiness(businessId);
    if (business.kidId !== kidId || business.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your business', 403);
    }

    const status = rawStatus && VALID_STATUSES.includes(rawStatus as CeoArtifactStatus)
      ? (rawStatus as CeoArtifactStatus)
      : undefined;
    const limit = limitRaw ? Math.max(1, Math.min(100, parseInt(limitRaw, 10))) : 50;

    const artifacts = await listArtifactsForBusiness(businessId, { status, limit });
    return apiSuccess({ artifacts });
  } catch (error) {
    return handleApiError(error);
  }
}

export const dynamic = 'force-dynamic';
