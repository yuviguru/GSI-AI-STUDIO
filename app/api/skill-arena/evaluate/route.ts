import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { skillArenaEvaluateSchema } from '@/lib/validators';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { filterInput } from '@/lib/safety/inputFilter';
import { evaluateAssessment } from '@/lib/skill-arena/evaluator';
import { scoreToBand, calculateAiPoints } from '@/lib/skill-arena/scoring';
import { updateSessionPoints } from '@/lib/firebase/sessionService';
import type {
  SkillArenaChallenge,
  SkillArenaDifficulty,
  SkillArenaModule,
  SkillArenaEvaluateResponse,
} from '@/types/mindx.types';

const ASSESSMENTS_COLLECTION = 'skillArenaAssessments';
const SESSIONS_COLLECTION = 'sessions';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const body = await request.json();
    const input = skillArenaEvaluateSchema.parse(body);

    // Load assessment
    const assessmentRef = adminDb.collection(ASSESSMENTS_COLLECTION).doc(input.assessmentId);
    const assessmentDoc = await assessmentRef.get();

    if (!assessmentDoc.exists) {
      throw new AppException('NOT_FOUND', 'Assessment not found', 404);
    }

    const assessment = assessmentDoc.data()!;

    if (assessment.sessionId !== sessionId) {
      throw new AppException('FORBIDDEN', 'Not your assessment', 403);
    }

    // Idempotent: return stored results if already completed
    if (assessment.status === 'completed') {
      const response: SkillArenaEvaluateResponse = {
        assessmentId: input.assessmentId,
        score: assessment.score as number,
        band: assessment.band as number,
        bandTitle: assessment.bandTitle as string,
        challengeResults: assessment.challengeResults,
        mentorFeedback: assessment.mentorFeedback,
        aiPointsEarned: assessment.aiPointsEarned as number,
        previousBand: assessment.previousBand ?? null,
        improved: assessment.improved ?? false,
        aiXray: assessment.aiXray,
      } as SkillArenaEvaluateResponse;
      return apiSuccess(response);
    }

    if (assessment.status !== 'pending') {
      throw new AppException('INVALID_STATE', 'Assessment not in valid state', 400);
    }

    // Safety filter text/voice answers
    for (const answer of input.answers) {
      if (answer.text) filterInput(answer.text);
      if (answer.voiceTranscript) filterInput(answer.voiceTranscript);
    }

    // AI evaluation
    const challenges = assessment.challenges as SkillArenaChallenge[];
    const assessmentModule = assessment.module as SkillArenaModule;
    const difficulty = assessment.difficulty as SkillArenaDifficulty;

    const evalResult = await evaluateAssessment(assessmentModule, challenges, input.answers, difficulty);

    // Calculate band
    const { band, bandTitle } = scoreToBand(evalResult.score);

    // Firestore transaction: update assessment + session progress
    // Re-read assessment inside transaction to guard against race conditions
    // (two concurrent requests both passing the pre-check above)
    const sessionRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);

    const { previousBand, improved, aiPointsEarned } = await adminDb.runTransaction(async (tx) => {
      // Re-check assessment status under transaction lock to prevent double-counting
      const [assessmentSnap, sessionDoc] = await Promise.all([
        tx.get(assessmentRef),
        tx.get(sessionRef),
      ]);

      const assessmentData = assessmentSnap.data()!;
      if (assessmentData.status !== 'pending') {
        throw new AppException('INVALID_STATE', 'Assessment already processed', 409);
      }

      const sessionData = sessionDoc.exists ? sessionDoc.data()! : {};

      // Get current module progress
      const progress = (sessionData.skillArenaProgress ?? {}) as Record<string, { band: number; score: number; assessments: number }>;
      const moduleProgress = progress[assessmentModule] ?? { band: 0, score: 0, assessments: 0 };

      const prevBand = moduleProgress.assessments > 0 ? moduleProgress.band : null;
      const isFirst = moduleProgress.assessments === 0;
      const isImproved = prevBand !== null && band > prevBand;

      // Calculate AI points
      const points = calculateAiPoints(band, isFirst, prevBand);

      // Compute trend
      const totalTime = input.answers.reduce((sum, a) => sum + a.timeUsedSeconds, 0);

      // Update session progress
      const updatedModuleProgress = {
        band,
        score: evalResult.score,
        assessments: moduleProgress.assessments + 1,
      };

      const updatedProgress = { ...progress, [assessmentModule]: updatedModuleProgress };

      // Update stats
      const stats = (sessionData.skillArenaStats ?? { totalAssessments: 0, averageBand: 0 }) as {
        totalAssessments: number;
        averageBand: number;
      };

      const newTotal = stats.totalAssessments + 1;
      const allBands = Object.values(updatedProgress).map((p) => p.band).filter((b) => b > 0);
      const avgBand = allBands.length > 0 ? Math.round(allBands.reduce((a, b) => a + b, 0) / allBands.length) : 0;

      tx.update(sessionRef, {
        skillArenaProgress: updatedProgress,
        skillArenaStats: { totalAssessments: newTotal, averageBand: avgBand },
      });

      // Update assessment to completed
      tx.update(assessmentRef, {
        status: 'completed',
        answers: input.answers,
        challengeResults: evalResult.challengeResults,
        score: evalResult.score,
        band,
        bandTitle,
        mentorFeedback: evalResult.mentorFeedback,
        aiXray: evalResult.aiXray,
        aiPointsEarned: points,
        previousBand: prevBand,
        improved: isImproved,
        timeUsedSeconds: totalTime,
        completedAt: Timestamp.now(),
      });

      return { previousBand: prevBand, improved: isImproved, aiPointsEarned: points };
    });

    // Award AI points (separate transaction via existing system)
    await updateSessionPoints(sessionId, {
      action: 'add_points',
      points: aiPointsEarned,
      concept: evalResult.aiXray.concept,
    });

    const response: SkillArenaEvaluateResponse = {
      assessmentId: input.assessmentId,
      score: evalResult.score,
      band,
      bandTitle,
      challengeResults: evalResult.challengeResults,
      mentorFeedback: evalResult.mentorFeedback,
      aiPointsEarned,
      previousBand,
      improved,
      aiXray: evalResult.aiXray,
    };

    return apiSuccess(response);
  } catch (error) {
    return handleApiError(error);
  }
}
