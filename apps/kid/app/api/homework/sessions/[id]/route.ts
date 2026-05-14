/**
 * GET /api/homework/sessions/:id
 *
 * Fetch a single homework session with the full transcript: every
 * question, every answer attempt, attempts count, whether the answer was
 * revealed. This is the trust-building surface parents open to verify
 * the AI isn't just handing answers out.
 *
 * Ownership is enforced by comparing the session's `gsiSessionId` to the
 * caller's resolved gsiSessionId (anonymous session OR their active
 * kid's bound bot session).
 *
 * @see /docs/api-contracts.md#homework-endpoints
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { hybridAuth } from '@/lib/auth-utils';
import { adminDb } from '@gsi/firebase/admin';
import { getHomeworkSession } from '@/lib/bot/services/homeworkSessionStore';
import type { HomeworkSession } from '@/lib/bot/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getHomeworkSession(params.id);
    if (!session) {
      throw new AppException('NOT_FOUND', 'Homework session not found.', 404);
    }

    const allowed = await ownsSession(request, session);
    if (!allowed) {
      throw new AppException('FORBIDDEN', 'That homework session is not yours.', 403);
    }

    return apiSuccess(toTranscript(session));
  } catch (error) {
    return handleApiError(error);
  }
}

async function ownsSession(
  request: NextRequest,
  session: HomeworkSession,
): Promise<boolean> {
  const result = await hybridAuth(request);

  if (result.type === 'anonymous') {
    return session.gsiSessionId === result.sessionId;
  }

  // Authenticated — allow when the session's kidId matches the caller's
  // X-Active-Kid-Id AND the caller owns that kid profile.
  const kidId = request.headers.get('X-Active-Kid-Id');
  if (!kidId) return false;
  if (session.kidId !== kidId) return false;

  const kidDoc = await adminDb.collection('kids').doc(kidId).get();
  if (!kidDoc.exists) return false;
  return kidDoc.data()?.parentId === result.auth.userId;
}

function toTranscript(session: HomeworkSession) {
  return {
    id: session.id,
    subject: session.subject,
    language: session.language,
    gradeEstimate: session.gradeEstimate,
    totalQuestions: session.totalQuestions,
    score: session.score,
    revealedQuestionIds: session.revealedQuestionIds,
    mode: session.progress.mode,
    startedAt: toIso(session.progress.startedAt),
    completedAt: session.progress.completedAt
      ? toIso(session.progress.completedAt)
      : null,
    questions: session.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      hint: q.hint,
      recitationText: q.recitationText,
      similarPractice: q.similarPractice,
    })),
    answers: session.progress.answers,
  };
}

function toIso(ts: unknown): string {
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
