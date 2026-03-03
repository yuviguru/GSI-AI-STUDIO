import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import {
  updateSessionPoints,
  getSessionPoints,
  type PointsAction,
} from '@/lib/firebase/sessionService';
import type { CreationType } from '@/types/creation.types';

const pointsActionSchema = z.object({
  action: z.enum(['add_points', 'learn_concept', 'track_creation', 'track_share']),
  payload: z.object({
    amount: z.number().int().min(1).max(50).optional(),
    concept: z.string().min(1).max(100).optional(),
    creationType: z.enum(['story', 'music', 'quiz', 'game', 'comic']).optional(),
  }).optional().default({}),
});

/**
 * PATCH /api/sessions/points
 * Update AI points, learn concepts, track creations/shares, and check badge unlocks.
 */
export async function PATCH(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('INVALID_INPUT', 'X-Session-Id header required', 400);
    }

    const body = await request.json();
    const parsed = pointsActionSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid input';
      throw new AppException('INVALID_INPUT', msg, 400);
    }

    const { action, payload } = parsed.data;

    const result = await updateSessionPoints(
      sessionId,
      action as PointsAction,
      {
        amount: payload.amount,
        concept: payload.concept,
        creationType: payload.creationType as CreationType | undefined,
      }
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/sessions/points
 * Get current points, badges, and stats for a session.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('INVALID_INPUT', 'X-Session-Id header required', 400);
    }

    const result = await getSessionPoints(sessionId);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
