import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { mindxEvaluateSchema } from '@/lib/validators';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { filterInput } from '@/lib/safety/inputFilter';
import { evaluateAllChallenges } from '@/lib/mindx/evaluator';
import { calculateTotalScore, getBand, calculatePoints, detectBandImprovement } from '@/lib/mindx/scoring';
import { generateMentorFeedback, generateXray } from '@/lib/mindx/mentorFeedback';
import { updateSessionPoints } from '@/lib/firebase/sessionService';
import type {
  SkillArenaChallenge,
  SkillArenaAnswer,
  SkillArenaEvaluateResponse,
  SkillArenaModule,
} from '@/types/mindx.types';

const ASSESSMENTS_COLLECTION = 'skillArenaAssessments';
const SESSIONS_COLLECTION = 'sessions';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const body = await request.json();
    const input = mindxEvaluateSchema.parse(body);

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

    // Idempotent: if already completed, return stored results
    if (assessment.status === 'completed') {
      const response: SkillArenaEvaluateResponse = {
        assessmentId: input.assessmentId,
        score: assessment.score,
        band: assessment.band,
        bandTitle: assessment.bandTitle,
        challengeResults: assessment.challenges.map(
          (c: { result: SkillArenaEvaluateResponse['challengeResults'][0] }) => c.result,
        ),
        mentorFeedback: assessment.mentorFeedback,
        aiPointsEarned: assessment.aiPointsEarned,
        previousBand: assessment.previousBand ?? null,
        improved: assessment.improved ?? false,
        aiXray: assessment.aiXray,
      };
      return apiSuccess(response);
    }

    if (assessment.status !== 'pending') {
      throw new AppException('INVALID_STATE', 'Assessment is not in a valid state', 400);
    }

    const challenges: SkillArenaChallenge[] = assessment.challenges;
    const answers: SkillArenaAnswer[] = input.answers;
    const assessmentModule = assessment.module as SkillArenaModule;

    // Safety-filter free-text answers
    for (const answer of answers) {
      if (answer.text) {
        try { filterInput(answer.text); } catch { /* let AI evaluate anyway */ }
      }
      if (answer.voiceTranscript) {
        try { filterInput(answer.voiceTranscript); } catch { /* let AI evaluate anyway */ }
      }
    }

    // Evaluate all challenges (MCQ: instant, text/voice: AI)
    const challengeResults = await evaluateAllChallenges(challenges, answers);

    // Calculate score and band
    const score = calculateTotalScore(challengeResults);
    const bandInfo = getBand(score);
    const previousBand = assessment.previousBand as number | null;
    const improved = detectBandImprovement(bandInfo.band, previousBand);

    // Check if this is the first assessment for this module
    const sessionDoc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    const sessionData = sessionDoc.exists ? sessionDoc.data()! : {};
    const moduleProgress = sessionData.skillArenaProgress?.[assessmentModule];
    const isFirstForModule = !moduleProgress || moduleProgress.assessments === 0;

    // Calculate points
    const aiPointsEarned = calculatePoints({
      band: bandInfo.band,
      isFirstForModule,
      previousBand,
    });

    // Generate mentor feedback
    const challengeResultsWithTypes = challenges.map((c, i) => ({
      type: c.type,
      result: challengeResults[i]!,
    }));

    const mentorFeedback = await generateMentorFeedback({
      module: assessmentModule,
      challengeResults: challengeResultsWithTypes,
      score,
      band: bandInfo.band,
      bandTitle: bandInfo.title,
    });

    // Generate AI X-Ray
    const aiXray = generateXray(assessmentModule);

    // Calculate total time used
    const timeUsedSeconds = answers.reduce((sum, a) => sum + a.timeUsedSeconds, 0);

    // Update assessment and session in a transaction
    const sessionRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);

    await adminDb.runTransaction(async (tx) => {
      const txSessionDoc = await tx.get(sessionRef);
      const txSessionData = txSessionDoc.exists ? txSessionDoc.data()! : {};

      // Build updated module progress
      const currentProgress = txSessionData.skillArenaProgress ?? {};
      const currentModuleData = currentProgress[assessmentModule] ?? {
        band: 0, bandTitle: 'Starter', score: 0, assessments: 0, trend: 'new',
      };

      const newModuleData = {
        band: bandInfo.band,
        bandTitle: bandInfo.title,
        score,
        assessments: (currentModuleData.assessments ?? 0) + 1,
        trend: improved ? 'improving' : currentModuleData.assessments > 0 ? 'stable' : 'new',
      };

      const updatedProgress = { ...currentProgress, [assessmentModule]: newModuleData };

      // Update stats
      const currentStats = txSessionData.skillArenaStats ?? {
        totalAssessments: 0, averageBand: 0,
      };
      const newTotal = currentStats.totalAssessments + 1;
      const newAvgBand = Math.round(
        ((currentStats.averageBand * currentStats.totalAssessments) + bandInfo.band) / newTotal * 100,
      ) / 100;

      tx.update(sessionRef, {
        skillArenaProgress: updatedProgress,
        skillArenaStats: {
          totalAssessments: newTotal,
          averageBand: newAvgBand,
        },
      });

      // Build completed challenges array
      const completedChallenges = challenges.map((c, i) => ({
        challenge: c,
        answer: answers.find((a) => a.challengeId === c.id) ?? {
          challengeId: c.id, timeUsedSeconds: 0,
        },
        result: challengeResults[i],
      }));

      tx.update(assessmentRef, {
        status: 'completed',
        challenges: completedChallenges,
        score,
        band: bandInfo.band,
        bandTitle: bandInfo.title,
        mentorFeedback,
        aiXray,
        timeUsedSeconds,
        aiPointsEarned,
        improved,
        completedAt: Timestamp.now(),
      });
    });

    // Award AI points (separate, like Beat the AI)
    await updateSessionPoints(sessionId, {
      action: 'add_points',
      points: aiPointsEarned,
      concept: aiXray.concept,
    });

    const response: SkillArenaEvaluateResponse = {
      assessmentId: input.assessmentId,
      score,
      band: bandInfo.band,
      bandTitle: bandInfo.title,
      challengeResults,
      mentorFeedback,
      aiPointsEarned,
      previousBand,
      improved,
      aiXray,
    };

    return apiSuccess(response);
  } catch (error) {
    return handleApiError(error);
  }
}
