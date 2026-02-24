import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { saveCreationSchema } from '@/lib/validators';
import { saveCreation, listCreations } from '@/lib/firebase/creationService';
import { checkRateLimit, trackCreation } from '@/lib/firebase/sessionService';
import type { CreationType } from '@/types/creation.types';

/**
 * POST /api/creations — Save a new creation
 * Validates session, checks rate limits, saves to Firestore.
 * See: docs/api-contracts.md#creations
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    // Validate session and rate limits
    await checkRateLimit(sessionId);

    const body = await request.json();
    const input = saveCreationSchema.parse(body);

    // Save creation to Firestore
    const result = await saveCreation({
      type: input.type,
      title: input.title,
      prompt: (body.prompt as string) ?? '',
      content: input.content,
      media: input.media,
      thumbnail: input.thumbnail,
      aiMetadata: input.aiMetadata,
      aiConceptsTaught: input.aiConceptsTaught,
      isPublic: input.isPublic,
      sessionId,
    });

    // Track creation for rate limiting
    await trackCreation(sessionId);

    return apiSuccess(
      {
        creationId: result.id,
        shareUrl: result.shareUrl,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/creations — List creations by session with optional filters
 * Query params: type, cursor, limit
 * See: docs/api-contracts.md#creations
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as CreationType | null;
    const cursor = searchParams.get('cursor');
    const limit = searchParams.get('limit');

    const result = await listCreations(sessionId, {
      type: type ?? undefined,
      cursor: cursor ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
