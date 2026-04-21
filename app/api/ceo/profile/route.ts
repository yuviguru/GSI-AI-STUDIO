import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoProfilePublicSchema } from '@/lib/validators';
import {
  getCeoProfileByBusiness,
  getPublicCeoProfile,
  setCeoProfilePublic,
  getCeoBusiness,
} from '@/lib/firebase/ceoService';
import { updateSessionPoints } from '@/lib/firebase/sessionService';
import type { CeoBusiness, CeoProfile } from '@/types';

type PublicCeoProfile = Omit<CeoProfile, 'userId' | 'kidId'>;
type PublicCeoBusiness = Omit<CeoBusiness, 'userId' | 'kidId'>;

/** Strip owner identifiers from a profile/business doc before returning on
 *  the public share endpoint. Keeps kid identity private. */
function stripPrivate<T extends { userId?: unknown; kidId?: unknown }>(doc: T) {
  const { userId: _u, kidId: _k, ...rest } = doc;
  return rest;
}

/**
 * GET /api/ceo/profile
 *
 * Two modes:
 *   - Public share:   `?s=<shareUrl>`. No auth needed. Returns profile + business
 *     only if `isPublic == true`, with userId/kidId stripped.
 *   - Authenticated:  header `Authorization: Bearer` + `X-Active-Kid-Id` +
 *     query `?businessId=<id>`. Kid must own the profile. Returns all fields.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareUrl = searchParams.get('s');

    // ── Public share path ──────────────────────────────────────
    if (shareUrl) {
      const profile = await getPublicCeoProfile(shareUrl);
      if (!profile) {
        throw new AppException('NOT_FOUND', 'Profile not found or not public', 404);
      }

      const business = await getCeoBusiness(profile.businessId);

      const publicProfile: PublicCeoProfile = stripPrivate(profile);
      const publicBusiness: PublicCeoBusiness = stripPrivate(business);

      return apiSuccess({ profile: publicProfile, business: publicBusiness });
    }

    // ── Authenticated path ─────────────────────────────────────
    const { kidId } = await requireAuthWithKid(request);

    const businessId = searchParams.get('businessId');
    if (!businessId) {
      throw new AppException('INVALID_INPUT', 'businessId required', 400);
    }

    const profile = await getCeoProfileByBusiness(businessId);
    if (profile.kidId !== kidId) {
      throw new AppException('FORBIDDEN', 'Profile does not belong to this kid', 403);
    }

    const business = await getCeoBusiness(businessId);
    return apiSuccess({ profile, business });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/ceo/profile
 * Toggle the profile's isPublic flag. First private→public flip awards
 * AI Points via track_share.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { kidId } = await requireAuthWithKid(request);
    // Points still live on the session counter; fall back to kidId as key if
    // the header isn't sent.
    const sessionId = request.headers.get('X-Session-Id') ?? kidId;

    const body = await request.json();
    const input = ceoProfilePublicSchema.parse(body);

    const existing = await getCeoProfileByBusiness(input.businessId);
    if (existing.kidId !== kidId) {
      throw new AppException('FORBIDDEN', 'Profile does not belong to this kid', 403);
    }

    const updatedProfile = await setCeoProfilePublic({
      businessId: input.businessId,
      isPublic: input.isPublic,
    });

    let newBadges: Awaited<ReturnType<typeof updateSessionPoints>>['newBadges'] = [];
    if (input.isPublic && !existing.isPublic) {
      try {
        const result = await updateSessionPoints(sessionId, { action: 'track_share' });
        newBadges = result.newBadges;
      } catch (err) {
        console.error('[ceo/profile] track_share failed:', (err as Error).message);
      }
    }

    return apiSuccess({ profile: updatedProfile, newBadges });
  } catch (error) {
    return handleApiError(error);
  }
}
