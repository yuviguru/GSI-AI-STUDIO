/**
 * Phase 4 (COMPLIANCE-002): parent consent API.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import {
  getConsentState,
  recordConsent,
  revokeConsent,
} from '@/lib/dpdp/consentService';
import {
  ALL_CONSENT_SCOPES,
  type ConsentScope,
} from '@/types/dpdp.types';

function isScope(v: unknown): v is ConsentScope {
  return (
    typeof v === 'string' && (ALL_CONSENT_SCOPES as string[]).includes(v)
  );
}

/** GET /api/dpdp/consent?kidId=... — current consent state for a kid. */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    const kidId = new URL(request.url).searchParams.get('kidId');
    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'kidId is required.', 400);
    }
    // Consent reads require the parent; ownership is re-checked by the
    // helpers below only on writes. For reads we verify kid ownership
    // inline.
    const kidSnap = await (await import('@/lib/firebase/admin')).adminDb
      .collection('kids')
      .doc(kidId)
      .get();
    if (!kidSnap.exists) {
      throw new AppException('NOT_FOUND', 'Kid not found.', 404);
    }
    const kid = kidSnap.data() ?? {};
    const parentId = kid.parentId as string | null | undefined;
    const schoolId = kid.schoolId as string | null | undefined;
    const isParent = parentId === auth.userId;
    // DPO view is scoped to the kid's own school — prevents a schoolAdmin
    // from one tenant reading consent state for a kid in another tenant
    // if they happen to know the kid ID.
    const isDpo =
      auth.role === 'schoolAdmin' && !!schoolId && schoolId === auth.schoolId;
    if (!isParent && !isDpo) {
      throw new AppException('FORBIDDEN', 'Not authorised to view this kid.', 403);
    }
    const state = await getConsentState(kidId);
    return apiSuccess({ kidId, state });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/dpdp/consent — grant or revoke consent for a scope. Parents
 * only; assumes the caller has recently completed OTP affirmation in the
 * client flow. Body: { kidId, scope, granted: boolean, method? }.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.role !== 'parent') {
      throw new AppException(
        'FORBIDDEN',
        'Only the parent can grant or revoke consent.',
        403,
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const kidId = typeof body.kidId === 'string' ? body.kidId : '';
    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'kidId is required.', 400);
    }
    if (!isScope(body.scope)) {
      throw new AppException('INVALID_INPUT', 'Unknown scope.', 400);
    }
    if (typeof body.granted !== 'boolean') {
      throw new AppException('INVALID_INPUT', 'granted must be a boolean.', 400);
    }

    const ip = request.headers.get('x-forwarded-for') ?? undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const record = body.granted
      ? await recordConsent({
          parentUid: auth.userId,
          kidId,
          scope: body.scope,
          granted: true,
          method: 'otp_affirmation',
          ip,
          userAgent,
        })
      : await revokeConsent({
          parentUid: auth.userId,
          kidId,
          scope: body.scope,
          ip,
          userAgent,
        });

    return apiSuccess({ record });
  } catch (error) {
    return handleApiError(error);
  }
}
