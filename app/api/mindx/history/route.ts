import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase/admin';
import type { SkillArenaHistoryItem } from '@/types/mindx.types';

const ASSESSMENTS_COLLECTION = 'skillArenaAssessments';
const DEFAULT_LIMIT = 10;

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const { searchParams } = new URL(request.url);
    const filterModule = searchParams.get('module');
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10),
      50,
    );
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    let query = adminDb
      .collection(ASSESSMENTS_COLLECTION)
      .where('sessionId', '==', sessionId)
      .where('status', '==', 'completed')
      .orderBy('completedAt', 'desc');

    if (filterModule) {
      query = query.where('module', '==', filterModule);
    }

    const snapshot = await query
      .offset(offset)
      .limit(limit)
      .get();

    const items: SkillArenaHistoryItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        module: data.module,
        score: data.score,
        band: data.band,
        bandTitle: data.bandTitle,
        difficulty: data.difficulty,
        aiPointsEarned: data.aiPointsEarned,
        completedAt: data.completedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return apiSuccess(items);
  } catch (error) {
    return handleApiError(error);
  }
}
