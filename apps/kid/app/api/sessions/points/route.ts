import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { getSessionPoints, updateSessionPoints } from '@gsi/firebase/sessionService';
import type { PointsAction } from '@gsi/firebase/sessionService';
import { verifyAuth } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';

const VALID_ACTIONS = ['add_points', 'learn_concept', 'track_creation', 'track_share'] as const;

/**
 * GET /api/sessions/points
 * Load current AI points, badges, and learning data for the session.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const data = await getSessionPoints(sessionId);
    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/sessions/points
 * Apply a points action (add_points, learn_concept, track_creation, track_share).
 * Returns updated data plus any newly unlocked badge IDs.
 */
export async function PATCH(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      throw new AppException(
        'INVALID_INPUT',
        `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
        400
      );
    }

    let pointsAction: PointsAction;

    switch (action) {
      case 'add_points': {
        const points = typeof body.points === 'number' ? body.points : 0;
        if (points < 0) {
          throw new AppException('INVALID_INPUT', 'Points must be non-negative', 400);
        }
        pointsAction = {
          action: 'add_points',
          points,
          concept: typeof body.concept === 'string' ? body.concept : undefined,
        };
        break;
      }
      case 'learn_concept': {
        if (!body.concept || typeof body.concept !== 'string') {
          throw new AppException('INVALID_INPUT', 'concept is required for learn_concept', 400);
        }
        pointsAction = { action: 'learn_concept', concept: body.concept };
        break;
      }
      case 'track_creation': {
        if (!body.creationType || typeof body.creationType !== 'string') {
          throw new AppException('INVALID_INPUT', 'creationType is required for track_creation', 400);
        }
        pointsAction = { action: 'track_creation', creationType: body.creationType };
        break;
      }
      case 'track_share':
        pointsAction = { action: 'track_share' };
        break;
      default:
        throw new AppException('INVALID_INPUT', 'Invalid action', 400);
    }

    const rawKidId =
      request.headers.get('X-Active-Kid-Id') ||
      (typeof body.kidId === 'string' ? body.kidId : undefined) ||
      undefined;

    // When a kid ID is provided, verify the caller owns it before allowing
    // the write-through to the kid document (Admin SDK bypasses Firestore rules).
    let activeKidId: string | undefined;
    if (rawKidId) {
      const auth = await verifyAuth(request);
      const kidDoc = await adminDb.collection('kids').doc(rawKidId).get();
      if (!kidDoc.exists || kidDoc.data()?.parentId !== auth.userId) {
        throw new AppException('FORBIDDEN', 'Kid profile not found or not owned by caller', 403);
      }
      activeKidId = rawKidId;
    }

    const result = await updateSessionPoints(sessionId, pointsAction, activeKidId);
    return apiSuccess({ ...result.data, newBadges: result.newBadges });
  } catch (error) {
    return handleApiError(error);
  }
}
