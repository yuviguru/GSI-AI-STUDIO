/**
 * Phase 4 (COMPLIANCE-002): right-to-erasure request queue.
 *
 * Creating a request is all we do synchronously — the actual cascade
 * delete runs in a worker (follow-up). DPDP Act requires completion
 * within 30 days.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import {
  createErasureRequest,
  listErasureRequestsForParent,
} from '@gsi/dpdp';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    // Parent-scoped list only. A schoolAdmin DPO school-wide list is a
    // follow-up (`listErasureRequestsForSchool` in the compliance query
    // service already exists and is consumed by the compliance v2 PDF +
    // DPO dashboard — expose it through a dedicated `/api/admin/dpdp/
    // erasure` route rather than overloading this one with a role-switch
    // that would silently treat the admin's uid as a parentUid).
    if (auth.role !== 'parent') {
      throw new AppException(
        'FORBIDDEN',
        'This endpoint lists only your own erasure requests. School admins use the compliance dashboard.',
        403,
      );
    }
    const requests = await listErasureRequestsForParent(auth.userId);
    return apiSuccess({ requests });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.role !== 'parent') {
      throw new AppException(
        'FORBIDDEN',
        'Only the parent can request erasure.',
        403,
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const kidId = typeof body.kidId === 'string' ? body.kidId : '';
    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'kidId is required.', 400);
    }
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : undefined;

    const req = await createErasureRequest({
      parentUid: auth.userId,
      kidId,
      reason,
    });
    return apiSuccess({ request: req }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
