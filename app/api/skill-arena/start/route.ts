import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { skillArenaStartSchema } from '@/lib/validators';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getChallengesForModule } from '@/lib/skill-arena/questionBank';
import { getDifficultyForBand } from '@/lib/skill-arena/scoring';
import { MODULE_INFO } from '@gsi/types';
import type { SkillArenaStartResponse } from '@gsi/types';

const ASSESSMENTS_COLLECTION = 'skillArenaAssessments';
const SESSIONS_COLLECTION = 'sessions';
const MAX_ASSESSMENTS_PER_DAY = 10;

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const body = await request.json();
    const input = skillArenaStartSchema.parse(body);

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
        "You've used all 10 assessments for today. Come back tomorrow!",
        429
      );
    }

    // Load session to get current band for difficulty adaptation
    const sessionDoc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    let currentBand = 0;

    if (sessionDoc.exists) {
      const data = sessionDoc.data();
      const progress = data?.skillArenaProgress as Record<string, { band: number }> | undefined;
      if (progress?.[input.module]) {
        currentBand = progress[input.module]!.band;
      }
    }

    // First assessment defaults to medium, subsequent adapt to band
    const difficulty = currentBand === 0 ? 'medium' : getDifficultyForBand(currentBand);

    // Generate 5 challenges
    const challenges = getChallengesForModule(input.module, difficulty);

    // Create pending assessment in Firestore
    const assessmentRef = adminDb.collection(ASSESSMENTS_COLLECTION).doc();
    await assessmentRef.set({
      id: assessmentRef.id,
      status: 'pending',
      module: input.module,
      difficulty,
      challenges: challenges.map((c) => ({
        id: c.id,
        type: c.type,
        module: c.module,
        question: c.question,
      })),
      sessionId,
      createdAt: Timestamp.now(),
    });

    const moduleInfo = MODULE_INFO[input.module];

    const response: SkillArenaStartResponse = {
      assessmentId: assessmentRef.id,
      module: input.module,
      difficulty,
      challenges,
      totalChallenges: challenges.length,
      estimatedTime: `${moduleInfo.estimatedTime} minutes`,
    };

    return apiSuccess(response);
  } catch (error) {
    return handleApiError(error);
  }
}
