/**
 * /api/performances/:id
 *
 * GET    — fetch a single performance feed item (public if visibility=public)
 * PATCH  — update visibility or caption (owner-only)
 * DELETE — soft-archive (owner-only)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { filterInput } from '@gsi/safety';
import {
  getPerformance,
  getPerformanceFeedItem,
  updatePerformance,
  deletePerformance,
} from '@gsi/firebase/performanceService';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id') ?? undefined;
    const perf = await getPerformance(params.id);

    // Privacy gate: only the owner can see private/draft/archived performances.
    const isOwner = sessionId !== undefined && perf.ownerSessionId === sessionId;
    const isPubliclyAvailable =
      perf.visibility === 'public' && perf.status === 'published';

    if (!isOwner && !isPubliclyAvailable) {
      throw new AppException('NOT_FOUND', 'Performance not found', 404);
    }

    const item = await getPerformanceFeedItem(params.id, sessionId);
    return apiSuccess({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  visibility: z.enum(['private', 'public', 'class']).optional(),
  caption: z.string().max(280).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }
    const body = await request.json();
    const input = patchSchema.parse(body);

    const safeCaption =
      input.caption !== undefined ? filterInput(input.caption) : undefined;

    const performance = await updatePerformance(params.id, sessionId, {
      visibility: input.visibility,
      caption: safeCaption,
    });
    return apiSuccess({ performance });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleApiError(
        new AppException(
          'INVALID_INPUT',
          error.errors[0]?.message ?? 'Invalid request',
          400,
        ),
      );
    }
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }
    await deletePerformance(params.id, sessionId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
