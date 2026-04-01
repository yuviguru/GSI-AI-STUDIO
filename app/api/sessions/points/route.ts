import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { getSessionPoints, updateSessionPoints } from '@/lib/firebase/sessionService';
import { getKidPoints, updateKidPoints, migrateSessionToKid } from '@/lib/firebase/kidPointsService';
import type { PointsAction } from '@/lib/firebase/sessionService';

const VALID_ACTIONS = ['add_points', 'learn_concept', 'track_creation', 'track_share'] as const;

/**
 * GET /api/sessions/points
 * Load current AI points, badges, and learning data.
 * Uses kid profile if X-Kid-Id header is present, otherwise session.
 */
export async function GET(request: NextRequest) {
  try {
    const kidId = request.headers.get('X-Kid-Id');
    const sessionId = request.headers.get('X-Session-Id');

    if (kidId) {
      // Auto-migrate: if session data exists, merge it into the kid profile once
      // This handles the transition from session-based to kid-based data storage
      const data = sessionId
        ? await migrateSessionToKid(kidId, sessionId)
        : await getKidPoints(kidId);
      return apiSuccess(data);
    }

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
 * Routes to kid profile if X-Kid-Id header is present, otherwise session.
 * Returns updated data plus any newly unlocked badge IDs.
 */
export async function PATCH(request: NextRequest) {
  try {
    const kidId = request.headers.get('X-Kid-Id');
    const sessionId = request.headers.get('X-Session-Id');

    if (!kidId && !sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session or kid identity', 401);
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

    // Route to kid profile or session based on header
    const result = kidId
      ? await updateKidPoints(kidId, pointsAction)
      : await updateSessionPoints(sessionId!, pointsAction);

    return apiSuccess({ ...result.data, newBadges: result.newBadges });
  } catch (error) {
    return handleApiError(error);
  }
}
