/**
 * POST /api/assets/upload-url
 *
 * Issues a pre-signed PUT URL for direct upload to the storage
 * provider (R2 in production, Firebase Storage as default fallback).
 *
 * Request body matches AssetUploadUrlRequest in types/asset.types.ts.
 *
 * Consent enforcement (Phase 2+):
 *   - audio + user_recording → requires `voice_recording` consent
 *   - video + user_recording → requires `video_recording` consent
 * Phase 1 anonymous sessions skip consent (no parent attached yet).
 *
 * See docs/api-contracts.md#post-apiassetsupload-url.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { createUploadUrl } from '@/lib/storage/assetService';
import { enforceIpRateLimit } from '@gsi/firebase/sessionService';

const bodySchema = z.object({
  kind: z.enum(['audio', 'video', 'image', 'pdf']),
  mimeType: z.string().min(1).max(80),
  sizeBytes: z.number().int().positive(),
  durationSec: z.number().nonnegative().max(600).optional(),
  sourceType: z.enum(['ai_generated', 'user_recording', 'user_upload']),
  parentRefType: z.enum(['creation', 'performance', 'standalone']).optional(),
  parentRefId: z.string().min(1).max(80).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const ipAddress =
      request.headers.get('x-nf-client-connection-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
    await enforceIpRateLimit(ipAddress);

    const body = await request.json();
    const input = bodySchema.parse(body);

    // Phase 1: anonymous sessions can record audio (no parent yet);
    // video uploads from user_recording are blocked.
    if (input.kind === 'video' && input.sourceType === 'user_recording') {
      throw new AppException(
        'CONSENT_MISSING',
        'Video recording requires parental consent (Phase 2+).',
        403,
      );
    }

    const result = await createUploadUrl({
      kind: input.kind,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      durationSec: input.durationSec,
      sourceType: input.sourceType,
      parentRefType: input.parentRefType,
      parentRefId: input.parentRefId,
      ownerSessionId: sessionId,
    });

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
