import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase/admin';
import type { SkillArenaHistoryItem } from '@gsi/types';

const ASSESSMENTS_COLLECTION = 'skillArenaAssessments';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '20'), 1), 50);
    const cursor = url.searchParams.get('cursor');

    let query = adminDb
      .collection(ASSESSMENTS_COLLECTION)
      .where('sessionId', '==', sessionId)
      .where('status', '==', 'completed')
      .orderBy('completedAt', 'desc')
      .limit(limit + 1); // Fetch one extra to detect if there are more

    if (cursor) {
      const cursorDoc = await adminDb.collection(ASSESSMENTS_COLLECTION).doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const resultDocs = hasMore ? docs.slice(0, limit) : docs;

    const items: SkillArenaHistoryItem[] = resultDocs.map((doc) => {
      const d = doc.data();
      return {
        id: d.id as string,
        module: d.module,
        score: d.score as number,
        band: d.band as number,
        bandTitle: d.bandTitle,
        difficulty: d.difficulty,
        aiPointsEarned: d.aiPointsEarned as number,
        completedAt: d.completedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return apiSuccess({
      items,
      nextCursor: hasMore ? resultDocs[resultDocs.length - 1]?.id : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
