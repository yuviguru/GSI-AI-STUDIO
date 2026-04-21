/**
 * GET /api/homework/history
 *
 * Parent/kid transparency surface — list the caller's recent homework
 * sessions (forwarded from the bot). Used by the web `/homework/history`
 * page so parents can review what the AI asked / what the kid answered.
 *
 * Anonymous callers (Phase 1 `X-Session-Id`) see sessions keyed off their
 * gsiSessionId. Authenticated callers (Phase 2) with an `X-Active-Kid-Id`
 * header see that kid's sessions — the caller must own the kid profile.
 *
 * @see /docs/api-contracts.md#homework-endpoints
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { hybridAuth } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { listRecentHomeworkSessions } from '@/lib/bot/services/homeworkSessionStore';
import type { HomeworkSession } from '@/lib/bot/types';

export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 20, 1), 50) : 20;

    const { gsiSessionId, kidId } = await resolveOwner(request);
    const sessions = await listRecentHomeworkSessions({
      gsiSessionId,
      kidId,
      limit,
    });

    return apiSuccess({
      sessions: sessions.map(toSummary),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Resolve the caller to a (gsiSessionId, kidId?) pair. Anonymous users
 *  look up their single bound bot session by sessionId; authenticated
 *  users look up their kid's bound bot session. */
async function resolveOwner(
  request: NextRequest,
): Promise<{ gsiSessionId: string; kidId: string | null }> {
  const result = await hybridAuth(request);

  if (result.type === 'anonymous') {
    // Anonymous — the "session" IS the gsiSessionId from the bot side
    // (same naming, same IDs). We just trust it and query directly.
    return { gsiSessionId: result.sessionId, kidId: null };
  }

  // Authenticated — require an active kid and resolve its bound bot session.
  const kidId = request.headers.get('X-Active-Kid-Id');
  if (!kidId) {
    throw new AppException(
      'KID_REQUIRED',
      'Pick a kid profile first.',
      400,
    );
  }

  const kidDoc = await adminDb.collection('kids').doc(kidId).get();
  if (!kidDoc.exists || kidDoc.data()?.parentId !== result.auth.userId) {
    throw new AppException('FORBIDDEN', 'That kid profile does not belong to you.', 403);
  }

  // Find the kid's bot-bound gsiSessionId via botSessions (one per chat,
  // shared gsiSessionId after /link). Fall back to kid.gsiSessionId when
  // the kid has created web-side sessions but no bot link yet.
  const botQuery = await adminDb
    .collection('botSessions')
    .where('kidId', '==', kidId)
    .limit(1)
    .get();
  if (!botQuery.empty) {
    const doc = botQuery.docs[0];
    const data = doc?.data() as { gsiSessionId?: string } | undefined;
    if (data?.gsiSessionId) {
      return { gsiSessionId: data.gsiSessionId, kidId };
    }
  }

  const kidData = kidDoc.data() as { gsiSessionId?: string } | undefined;
  if (kidData?.gsiSessionId) {
    return { gsiSessionId: kidData.gsiSessionId, kidId };
  }

  // No sessions ever → return an empty history rather than erroring.
  return { gsiSessionId: '__none__', kidId };
}

/** Compact, web-friendly shape for list rendering. Drops `originalText`,
 *  `questions`, and `progress.answers` — the detail view loads them via
 *  `GET /api/homework/sessions/:id` on demand. */
function toSummary(session: HomeworkSession) {
  return {
    id: session.id,
    subject: session.subject,
    language: session.language,
    gradeEstimate: session.gradeEstimate,
    totalQuestions: session.totalQuestions,
    score: session.score,
    revealedCount: session.revealedQuestionIds.length,
    mode: session.progress.mode,
    startedAt: toIso(session.progress.startedAt),
    completedAt: session.progress.completedAt
      ? toIso(session.progress.completedAt)
      : null,
  };
}

function toIso(ts: unknown): string {
  // firebase-admin Timestamp or a serialised {seconds, nanoseconds} — both
  // expose `.toDate()` via the Admin SDK. Guard defensively for safety.
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as { toDate: unknown }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  if (ts && typeof ts === 'object' && 'seconds' in ts) {
    const sec = Number((ts as { seconds: unknown }).seconds);
    return new Date(sec * 1000).toISOString();
  }
  if (typeof ts === 'string') return ts;
  return new Date().toISOString();
}
