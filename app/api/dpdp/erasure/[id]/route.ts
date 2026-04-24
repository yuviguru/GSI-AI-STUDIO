import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { getErasureRequest } from '@/lib/dpdp/dataErasure';

/** GET /api/dpdp/erasure/[id] — status check. Parent of kid, OR the DPO
 *  (schoolAdmin) of the kid's school. Any other caller gets 403. */
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

    // DPO access: scope by the subject kid's schoolId so a schoolAdmin
    // from one tenant cannot read another tenant's erasure requests by
    // guessing / leaking an ID.
    let isDpo = false;
    if (!isOwner && auth.role === 'schoolAdmin' && auth.schoolId) {
      const kidSnap = await adminDb.collection('kids').doc(req.kidId).get();
      const kidSchoolId = kidSnap.data()?.schoolId as string | undefined;
      isDpo = !!kidSchoolId && kidSchoolId === auth.schoolId;
    }

    if (!isOwner && !isDpo) {
      throw new AppException('FORBIDDEN', 'Not authorised.', 403);
    }
    return apiSuccess({ request: req });
  } catch (error) {
    return handleApiError(error);
  }
}
