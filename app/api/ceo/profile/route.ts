import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { ceoProfilePublicSchema } from '@/lib/validators';
import {
  getCeoProfileByBusiness,
  getPublicCeoProfile,
  setCeoProfilePublic,
  getCeoBusiness,
} from '@/lib/firebase/ceoService';
import { updateSessionPoints } from '@/lib/firebase/sessionService';
import type { CeoBusiness, CeoProfile } from '@/types';

type PublicCeoProfile = Omit<CeoProfile, 'sessionId' | 'userId' | 'kidId'>;
type PublicCeoBusiness = Omit<CeoBusiness, 'sessionId' | 'userId' | 'kidId'>;

/** Strip session-level identifiers from a profile or business doc before
 *  returning it on the public share endpoint. Keeps kid identity private. */
function stripPrivate<T extends { sessionId?: unknown; userId?: unknown; kidId?: unknown }>(
  doc: T,
) {
  const { sessionId: _s, userId: _u, kidId: _k, ...rest } = doc;
  return rest;
}

/**
 * GET /api/ceo/profile
 * Return the CEO DNA Card profile + its business.
 *
 * Two modes:
 *   - Authenticated: header X-Session-Id + ?businessId=<id>. Session must own
 *     the profile. Returns all fields.
 *   - Public share:  ?s=<shareUrl>. No session required. Only returns the
 *     profile if isPublic == true. Strips sessionId/userId/kidId for privacy.
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
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const businessId = searchParams.get('businessId');
    if (!businessId) {
      throw new AppException('INVALID_INPUT', 'businessId required', 400);
    }

    const profile = await getCeoProfileByBusiness(businessId);
    if (profile.sessionId !== sessionId) {
      throw new AppException('FORBIDDEN', 'Profile does not belong to this session', 403);
    }

    const business = await getCeoBusiness(businessId);

    return apiSuccess({ profile, business });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/ceo/profile
 * Toggle the profile's isPublic flag. If flipping from private → public for
 * the first time, award AI Points via the track_share action.
 */
export async function PATCH(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const input = ceoProfilePublicSchema.parse(body);

    // Ownership check — fetch existing profile before mutating.
    const existing = await getCeoProfileByBusiness(input.businessId);
    if (existing.sessionId !== sessionId) {
      throw new AppException('FORBIDDEN', 'Profile does not belong to this session', 403);
    }

    const updatedProfile = await setCeoProfilePublic({
      businessId: input.businessId,
      isPublic: input.isPublic,
    });

    // Points only on the first flip from private → public. If it was already
    // public, republishing the same share shouldn't re-award points.
    let newBadges: Awaited<ReturnType<typeof updateSessionPoints>>['newBadges'] = [];
    if (input.isPublic && !existing.isPublic) {
      const result = await updateSessionPoints(sessionId, { action: 'track_share' });
      newBadges = result.newBadges;
    }

    return apiSuccess({ profile: updatedProfile, newBadges });
  } catch (error) {
    return handleApiError(error);
  }
}
