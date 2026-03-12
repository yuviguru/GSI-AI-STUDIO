import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { mindxStartSchema } from '@/lib/validators';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getRandomChallenges } from '@/lib/mindx/questionBank';
import { getDifficulty } from '@/lib/mindx/scoring';
import { MODULE_INFO } from '@/types/mindx.types';
import type { SkillArenaStartResponse, SkillArenaModule } from '@/types/mindx.types';

const ASSESSMENTS_COLLECTION = 'skillArenaAssessments';
const SESSIONS_COLLECTION = 'sessions';
const MAX_ASSESSMENTS_PER_DAY = 3;

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const body = await request.json();
    const input = mindxStartSchema.parse(body);
    const selectedModule = input.module as SkillArenaModule;

    // Rate limit: count today's assessments for this session
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCount = await adminDb
      .collection(ASSESSMENTS_COLLECTION)
      .where('sessionId', '==', sessionId)
      .where('createdAt', '>=', Timestamp.fromDate(todayStart))
      .count()
      .get();

    if (todayCount.data().count >= MAX_ASSESSMENTS_PER_DAY) {
      throw new AppException(
        'RATE_LIMITED',
        "You've completed 3 assessments today. Come back tomorrow for more!",
        429,
      );
    }

    // Load session to get previous band for this module
    const sessionDoc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    let previousBand: number | null = null;

    if (sessionDoc.exists) {
      const data = sessionDoc.data();
      const moduleProgress = data?.skillArenaProgress?.[selectedModule];
      if (moduleProgress?.band) {
        previousBand = moduleProgress.band;
      }
    }

    // Determine difficulty based on previous band
    const difficulty = getDifficulty(previousBand);

    // Get 5 random challenges
    const challenges = getRandomChallenges(selectedModule, difficulty, 5);

    // Create pending assessment in Firestore
    const assessmentRef = adminDb.collection(ASSESSMENTS_COLLECTION).doc();
    await assessmentRef.set({
      id: assessmentRef.id,
      status: 'pending',
      module: selectedModule,
      difficulty,
      challenges,
      sessionId,
      previousBand,
      createdAt: Timestamp.now(),
    });

    const moduleInfo = MODULE_INFO[selectedModule];
    const response: SkillArenaStartResponse = {
      assessmentId: assessmentRef.id,
      module: selectedModule,
      difficulty,
      challenges,
      totalChallenges: challenges.length,
      estimatedTime: `${moduleInfo.estimatedTime} min`,
    };

    return apiSuccess(response);
  } catch (error) {
    return handleApiError(error);
  }
}
