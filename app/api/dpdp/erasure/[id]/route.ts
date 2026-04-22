import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { getErasureRequest } from '@/lib/dpdp/dataErasure';

/** GET /api/dpdp/erasure/[id] — status check. Parent or schoolAdmin. */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await verifyAuth(request);
    const req = await getErasureRequest(params.id);
    if (!req) {
      throw new AppException('NOT_FOUND', 'Erasure request not found.', 404);
    }
    const isOwner = req.parentUid === auth.userId;
    if (!isOwner && auth.role !== 'schoolAdmin') {
      throw new AppException('FORBIDDEN', 'Not authorised.', 403);
    }
    return apiSuccess({ request: req });
  } catch (error) {
    return handleApiError(error);
  }
}
