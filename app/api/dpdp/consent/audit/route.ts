/**
 * GET /api/dpdp/consent/audit?kidId=... — full tamper-evident consent
 * trail for a kid. Returns newest first. Parent of kid OR schoolAdmin
 * (DPO view) only.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { getConsentAudit } from '@/lib/dpdp/consentService';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const kidId = new URL(request.url).searchParams.get('kidId');
    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'kidId is required.', 400);
    }

    const kidSnap = await adminDb.collection('kids').doc(kidId).get();
    if (!kidSnap.exists) {
      throw new AppException('NOT_FOUND', 'Kid not found.', 404);
    }
    const kid = kidSnap.data() ?? {};
    const parentId = kid.parentId as string | null | undefined;
    const schoolId = kid.schoolId as string | null | undefined;

    const isParent = parentId === auth.userId;
    const isDpo = auth.role === 'schoolAdmin' && schoolId === auth.schoolId;
    if (!isParent && !isDpo) {
      throw new AppException('FORBIDDEN', 'Not authorised to view this audit.', 403);
    }

    const audit = await getConsentAudit(kidId);
    return apiSuccess({ kidId, audit });
  } catch (error) {
    return handleApiError(error);
  }
}
