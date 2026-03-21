import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase/admin';
import type { SkillArenaModule, SkillArenaModuleProgress, SkillArenaProgress } from '@/types/mindx.types';
import { SKILL_ARENA_BANDS } from '@/types/mindx.types';

const SESSIONS_COLLECTION = 'sessions';
const ASSESSMENTS_COLLECTION = 'skillArenaAssessments';

const ALL_MODULES: SkillArenaModule[] = ['speaking', 'listening', 'thinking', 'reading'];

function bandToTitle(band: number) {
  const found = SKILL_ARENA_BANDS.find((b) => b.band === band);
  return found?.title ?? 'Starter';
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const sessionDoc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    if (!sessionDoc.exists) {
      throw new AppException('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const data = sessionDoc.data()!;
    const storedProgress = (data.skillArenaProgress ?? {}) as Record<string, { band: number; score: number; assessments: number }>;
    const stats = (data.skillArenaStats ?? { totalAssessments: 0, averageBand: 0 }) as {
      totalAssessments: number;
      averageBand: number;
    };

    // Build module progress map
    const modules = {} as Record<SkillArenaModule, SkillArenaModuleProgress>;
    let strongestModule: SkillArenaModule | null = null;
    let recommendedModule: SkillArenaModule | null = null;
    let maxBand = 0;
    let minBand = 6;

    for (const mod of ALL_MODULES) {
      const mp = storedProgress[mod] ?? { band: 0, score: 0, assessments: 0 };
      const trend = mp.assessments === 0 ? 'new' as const : 'stable' as const;

      modules[mod] = {
        module: mod,
        band: mp.band,
        bandTitle: mp.band > 0 ? bandToTitle(mp.band) : 'Starter',
        score: mp.score,
        assessments: mp.assessments,
        trend,
      };

      if (mp.band > maxBand) {
        maxBand = mp.band;
        strongestModule = mod;
      }
      if (mp.band < minBand || mp.assessments === 0) {
        minBand = mp.band;
        recommendedModule = mod;
      }
    }

    // Calculate total points earned from completed assessments
    const completedAssessments = await adminDb
      .collection(ASSESSMENTS_COLLECTION)
      .where('sessionId', '==', sessionId)
      .where('status', '==', 'completed')
      .select('aiPointsEarned')
      .get();

    let totalPointsEarned = 0;
    completedAssessments.forEach((doc) => {
      totalPointsEarned += (doc.data().aiPointsEarned as number) || 0;
    });

    const response: SkillArenaProgress = {
      modules,
      overallBand: stats.averageBand,
      totalAssessments: stats.totalAssessments,
      totalPointsEarned,
      strongestModule,
      recommendedModule,
    };

    return apiSuccess(response);
  } catch (error) {
    return handleApiError(error);
  }
}
