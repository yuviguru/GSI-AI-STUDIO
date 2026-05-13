/**
 * POST /api/performances/:id/react
 * Toggle an emoji reaction. Same emoji twice removes it.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { reactToPerformance } from '@gsi/firebase/performanceService';

const bodySchema = z.object({
  emoji: z.string().min(1).max(8),
});

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const { emoji } = bodySchema.parse(body);

    const result = await reactToPerformance(params.id, sessionId, emoji);
    return apiSuccess(result);
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
