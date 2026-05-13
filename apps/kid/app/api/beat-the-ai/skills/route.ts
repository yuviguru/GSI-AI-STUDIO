import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminDb } from '@gsi/firebase/admin';
import { getDefaultSkills, getSkillLevel } from '@/lib/beat-the-ai/skillEngine';
import type { BeatTheAiSkillId, BeatTheAiSkills, BeatTheAiSkillsResponse } from '@gsi/types';

const SESSIONS_COLLECTION = 'sessions';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const doc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    if (!doc.exists) {
      throw new AppException('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const data = doc.data()!;
    let skills: BeatTheAiSkills = getDefaultSkills();

    if (data.beatTheAiSkills) {
      for (const [id, stored] of Object.entries(data.beatTheAiSkills as Record<string, { xp: number }>)) {
        if (id in skills) {
          skills[id as BeatTheAiSkillId] = getSkillLevel(stored.xp);
        }
      }
    }

    const allXp = Object.values(skills).map((s) => s.xp);
    const totalXp = allXp.reduce((a, b) => a + b, 0);
    const allLevels = Object.values(skills).map((s) => s.level);
    const overallLevel = Math.round(allLevels.reduce((a, b) => a + b, 0) / allLevels.length);

    const response: BeatTheAiSkillsResponse = {
      skills,
      overallLevel,
      totalXp,
    };

    return apiSuccess(response);
  } catch (error) {
    return handleApiError(error);
  }
}
