import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase/admin';
import { getStrongestModule, getRecommendedModule, getBandTitle } from '@/lib/mindx/scoring';
import type {
  SkillArenaModule,
  SkillArenaModuleProgress,
  SkillArenaProgress,
} from '@/types/mindx.types';

const SESSIONS_COLLECTION = 'sessions';

const ALL_MODULES: SkillArenaModule[] = ['speaking', 'listening', 'thinking', 'reading'];

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const sessionDoc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();

    if (!sessionDoc.exists) {
      // Return empty progress for new sessions
      return apiSuccess(buildEmptyProgress());
    }

    const data = sessionDoc.data()!;
    const rawProgress = data.skillArenaProgress ?? {};
    const stats = data.skillArenaStats ?? { totalAssessments: 0, averageBand: 0 };

    // Build module progress for all 4 modules
    const modules = {} as Record<SkillArenaModule, SkillArenaModuleProgress>;
    let totalPoints = 0;

    for (const mod of ALL_MODULES) {
      const modData = rawProgress[mod];
      if (modData && modData.assessments > 0) {
        modules[mod] = {
          module: mod,
          band: modData.band,
          bandTitle: getBandTitle(modData.band),
          score: modData.score,
          assessments: modData.assessments,
          trend: modData.trend ?? 'stable',
        };
      } else {
        modules[mod] = {
          module: mod,
          band: 0,
          bandTitle: 'Starter',
          score: 0,
          assessments: 0,
          trend: 'new',
        };
      }
    }

    // Overall band is the average of attempted modules' bands
    const attemptedModules = Object.values(modules).filter((m) => m.assessments > 0);
    const overallBand = attemptedModules.length > 0
      ? Math.round(attemptedModules.reduce((s, m) => s + m.band, 0) / attemptedModules.length)
      : 0;

    // Get total points from session
    totalPoints = data.aiPoints ?? 0;

    const progress: SkillArenaProgress = {
      modules,
      overallBand,
      totalAssessments: stats.totalAssessments,
      totalPointsEarned: totalPoints,
      strongestModule: getStrongestModule(modules),
      recommendedModule: getRecommendedModule(modules),
    };

    return apiSuccess(progress);
  } catch (error) {
    return handleApiError(error);
  }
}

function buildEmptyProgress(): SkillArenaProgress {
  const modules = {} as Record<SkillArenaModule, SkillArenaModuleProgress>;
  for (const mod of ALL_MODULES) {
    modules[mod] = {
      module: mod,
      band: 0,
      bandTitle: 'Starter',
      score: 0,
      assessments: 0,
      trend: 'new',
    };
  }

  return {
    modules,
    overallBand: 0,
    totalAssessments: 0,
    totalPointsEarned: 0,
    strongestModule: null,
    recommendedModule: 'speaking',
  };
}
