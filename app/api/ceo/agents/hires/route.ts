import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { getCeoBusiness } from '@/lib/firebase/ceoService';
import { listHiresForBusiness } from '@/lib/firebase/ceoAgentHireService';

/**
 * GET /api/ceo/agents/hires?businessId=...
 *
 * Lists hires for a business. Scoped to active by default; pass
 * `?status=dismissed` to see dismissed hires.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const url = new URL(request.url);
    const businessId = url.searchParams.get('businessId');
    const status = url.searchParams.get('status') as 'active' | 'paused' | 'dismissed' | null;

    if (!businessId) {
      throw new AppException('INVALID_INPUT', 'businessId query param is required', 400);
    }

    const business = await getCeoBusiness(businessId);
    if (business.kidId !== kidId || business.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your business', 403);
    }

    const hires = await listHiresForBusiness(businessId, status ? { status } : undefined);
    return apiSuccess({ hires });
  } catch (error) {
    return handleApiError(error);
  }
}

export const dynamic = 'force-dynamic';
