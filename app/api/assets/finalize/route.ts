/**
 * POST /api/assets/finalize
 *
 * Confirm the upload completed at the storage provider; server checks
 * the object exists, sets status='ready', runs auto-moderation.
 *
 * See docs/api-contracts.md#post-apiassetsfinalize.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { finalizeAsset, getAsset } from '@/lib/storage/assetService';

const bodySchema = z.object({
  assetId: z.string().min(1).max(80),
});

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const { assetId } = bodySchema.parse(body);

    // Ownership check BEFORE mutation. finalizeAsset HEADs storage and
    // flips status='ready' / sets publicUrl, so we can't let a non-owner
    // trigger that just to discover it isn't theirs after the fact.
    const existing = await getAsset(assetId);
    if (existing.ownerSessionId && existing.ownerSessionId !== sessionId) {
      throw new AppException('FORBIDDEN', 'Not your asset', 403);
    }

    const asset = await finalizeAsset(assetId);
    return apiSuccess({ asset });
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
