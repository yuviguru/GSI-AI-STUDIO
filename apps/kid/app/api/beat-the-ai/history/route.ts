import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminDb } from '@gsi/firebase/admin';

const ROUNDS_COLLECTION = 'beatTheAiRounds';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);
    const cursor = searchParams.get('cursor');

    let query = adminDb
      .collection(ROUNDS_COLLECTION)
      .where('sessionId', '==', sessionId)
      .where('status', '==', 'completed')
      .orderBy('completedAt', 'desc')
      .limit(limit);

    if (cursor) {
      const cursorDoc = await adminDb.collection(ROUNDS_COLLECTION).doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const rounds = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: d.id,
        category: d.category,
        promptText: d.prompt?.text,
        result: d.result,
        kidAvgScore: d.kidAvgScore,
        aiAvgScore: d.aiAvgScore,
        aiPointsEarned: d.aiPointsEarned,
        completedAt: d.completedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = snapshot.docs.length === limit ? lastDoc?.id : null;

    return apiSuccess({ rounds, nextCursor });
  } catch (error) {
    return handleApiError(error);
  }
}
