import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { saveCreationSchema } from '@/lib/validators';
import { saveCreation, listCreations, migrateSessionCreationsToKid } from '@/lib/firebase/creationService';
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
    const kidId = request.headers.get('X-Kid-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    // Validate session and rate limits
    await checkRateLimit(sessionId);

    const body = await request.json();
    const input = saveCreationSchema.parse(body);

    // Track quota before persisting to avoid orphaned creations on quota failure
    await trackCreation(sessionId);

    // Save creation to Firestore — scope to kid profile if authenticated
    const result = await saveCreation({
      type: input.type,
      title: input.title,
      prompt: input.prompt,
      content: input.content,
      media: input.media,
      thumbnail: input.thumbnail,
      aiMetadata: input.aiMetadata,
      aiConceptsTaught: input.aiConceptsTaught,
      isPublic: input.isPublic,
      sessionId,
      kidId: kidId ?? undefined,
    });

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
    const kidId = request.headers.get('X-Kid-Id');
    if (!sessionId && !kidId) {
      throw new AppException('UNAUTHORIZED', 'Missing session or kid identity', 401);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as CreationType | null;
    const cursor = searchParams.get('cursor');
    const limitRaw = searchParams.get('limit');
    const parsedLimit = limitRaw ? parseInt(limitRaw, 10) : NaN;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    // One-time migration: stamp kidId on existing session creations
    // so they appear under the kid profile. Only for the kid who owns this session.
    // Fire-and-forget — if it fails, old creations will migrate on next load.
    if (kidId && sessionId) {
      migrateSessionCreationsToKid(sessionId, kidId).catch(() => {
        // Non-blocking
      });
    }

    // Scope to kid profile if authenticated, otherwise session
    const result = await listCreations(sessionId ?? '', {
      type: type ?? undefined,
      cursor: cursor ?? undefined,
      limit,
      kidId: kidId ?? undefined,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
