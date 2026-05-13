/**
 * /api/performances
 *
 * POST — create a performance after the audio (and optional video) asset
 *        has been finalized.
 * GET  — list performances. Three modes:
 *        - mine=true             → current session's performances
 *        - parentCreationId=...  → performances on a creation
 *        - visibility=public     → Explore feed
 *
 * See docs/api-contracts.md#performance-endpoints-perf-001.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { filterInput } from '@gsi/safety';
import { enforceIpRateLimit } from '@/lib/firebase/sessionService';
import {
  createPerformance,
  listPerformances,
} from '@/lib/firebase/performanceService';
import type {
  PerformanceKind,
  PerformanceVisibility,
} from '@gsi/types';
import type { CreationType } from '@gsi/types';

const createSchema = z.object({
  kind: z.enum(['sing_along', 'reading', 'voice_memo', 'reaction']),
  parentCreationId: z.string().min(1).max(80).optional(),
  audioAssetId: z.string().min(1).max(80),
  videoAssetId: z.string().min(1).max(80).optional(),
  durationSec: z.number().nonnegative().max(120),
  caption: z.string().max(280).optional(),
  visibility: z.enum(['private', 'public', 'class']).optional(),
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
    const input = createSchema.parse(body);

    // Caption goes through the topical + profanity filter (throws on hit).
    let safeCaption: string | undefined;
    if (input.caption && input.caption.trim().length > 0) {
      safeCaption = filterInput(input.caption);
    }

    const performance = await createPerformance({
      kind: input.kind,
      parentCreationId: input.parentCreationId,
      audioAssetId: input.audioAssetId,
      videoAssetId: input.videoAssetId,
      durationSec: input.durationSec,
      caption: safeCaption,
      visibility: input.visibility,
      ownerSessionId: sessionId,
    });

    return apiSuccess({ performance, shareUrl: performance.shareUrl });
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

const listQuerySchema = z.object({
  mine: z.string().optional(),
  parentCreationId: z.string().optional(),
  parentCreationType: z.enum(['story', 'music', 'quiz', 'game', 'comic']).optional(),
  kind: z.enum(['sing_along', 'reading', 'voice_memo', 'reaction']).optional(),
  visibility: z.enum(['private', 'public', 'class']).optional(),
  sort: z.enum(['newest', 'trending']).optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id') ?? undefined;
    const url = new URL(request.url);
    const q = listQuerySchema.parse(Object.fromEntries(url.searchParams));

    const filters: Parameters<typeof listPerformances>[0] = {
      sort: q.sort ?? 'newest',
    };

    // Scope enforcement: every list query MUST resolve to one of two
    // safe scopes — the caller's own performances, or public+published.
    // Bare queries (no `mine`, no `visibility`) default to public+published
    // so we can never accidentally leak private/draft items.
    const requestedMine = q.mine === 'true';
    const requestedVisibility = q.visibility as PerformanceVisibility | undefined;

    if (requestedMine) {
      if (!sessionId) {
        throw new AppException('UNAUTHORIZED', 'Missing session for mine=true', 401);
      }
      filters.ownerSessionId = sessionId;
      // Owner-scoped queries can request any visibility/status.
      if (requestedVisibility) filters.visibility = requestedVisibility;
    } else {
      // Anonymous / cross-session queries: hard-locked to public+published.
      // Reject any non-public visibility request from non-owners.
      if (requestedVisibility && requestedVisibility !== 'public') {
        throw new AppException(
          'FORBIDDEN',
          'Only your own performances can be listed with non-public visibility. Pass mine=true.',
          403,
        );
      }
      filters.visibility = 'public';
      filters.status = 'published';
    }

    if (q.parentCreationId) filters.parentCreationId = q.parentCreationId;
    if (q.parentCreationType) {
      filters.parentCreationType = q.parentCreationType as CreationType;
    }
    if (q.kind) filters.kind = q.kind as PerformanceKind;
    if (q.limit) filters.limit = parseInt(q.limit, 10);
    if (q.cursor) filters.cursor = q.cursor;

    const result = await listPerformances(filters, sessionId);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleApiError(
        new AppException(
          'INVALID_INPUT',
          error.errors[0]?.message ?? 'Invalid query',
          400,
        ),
      );
    }
    return handleApiError(error);
  }
}
