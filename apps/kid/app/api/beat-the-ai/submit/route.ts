import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import {
  beatTheAiSubmitResponseSchema,
  beatTheAiJudgeSchema,
} from '@/lib/validators';
import { adminDb } from '@gsi/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { filterInput } from '@gsi/safety';
import { generateAiResponse } from '@/lib/beat-the-ai/aiOpponent';
import { judgeResponses } from '@/lib/beat-the-ai/aiJudge';
import {
  calculateSkillXp,
  calculateAvgScore,
  determineResult,
  calculateAiPoints,
  getSkillLevel,
  getDefaultSkills,
  detectLevelUp,
} from '@/lib/beat-the-ai/skillEngine';
import { updateSessionPoints } from '@gsi/firebase/sessionService';
import type {
  BeatTheAiDifficulty,
  BeatTheAiPrompt,
  BeatTheAiScores,
  BeatTheAiSkillId,
  BeatTheAiSkills,
  BeatTheAiSubmitResponse,
  BeatTheAiSubmitResponseResult,
} from '@gsi/types';

const ROUNDS_COLLECTION = 'beatTheAiRounds';
const SESSIONS_COLLECTION = 'sessions';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const body = await request.json();

    // Detect phase by request body shape
    if ('kidResponse' in body) {
      return handlePhase1(sessionId, body);
    } else if ('judge' in body) {
      return handlePhase2(sessionId, body);
    }

    throw new AppException('INVALID_INPUT', 'Invalid request format', 400);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Phase 1: Kid submits their response → AI generates its version */
async function handlePhase1(sessionId: string, body: unknown) {
  const input = beatTheAiSubmitResponseSchema.parse(body);

  // Load and verify round
  const roundRef = adminDb.collection(ROUNDS_COLLECTION).doc(input.roundId);
  const roundDoc = await roundRef.get();

  if (!roundDoc.exists) {
    throw new AppException('NOT_FOUND', 'Round not found', 404);
  }

  const round = roundDoc.data()!;

  if (round.sessionId !== sessionId) {
    throw new AppException('FORBIDDEN', 'Not your round', 403);
  }

  if (round.status !== 'pending') {
    throw new AppException('INVALID_STATE', 'Round already submitted', 400);
  }

  // Validate timing (min 10s, max timeLimit + 30s buffer)
  const timeLimit = (round.prompt as BeatTheAiPrompt).timeLimit;
  if (input.timeUsedSeconds < 10) {
    throw new AppException('INVALID_INPUT', 'That was too quick! Take your time to write.', 400);
  }
  if (input.timeUsedSeconds > timeLimit + 30) {
    throw new AppException('INVALID_INPUT', 'Time limit exceeded', 400);
  }

  // Safety filter kid's response
  filterInput(input.kidResponse);

  // Generate AI response
  const aiResult = await generateAiResponse(
    round.prompt as BeatTheAiPrompt,
    round.aiDifficulty as BeatTheAiDifficulty
  );

  // Update round to revealed state
  await roundRef.update({
    status: 'revealed',
    kidResponse: input.kidResponse,
    aiResponse: aiResult.text,
    aiXray: aiResult.xray,
    timeUsedSeconds: input.timeUsedSeconds,
  });

  const response: BeatTheAiSubmitResponseResult = {
    aiResponse: aiResult.text,
    aiXray: aiResult.xray,
  };

  return apiSuccess(response);
}

/** Phase 2: AI judges both responses → Calculate scores, XP, points */
async function handlePhase2(sessionId: string, body: unknown) {
  const input = beatTheAiJudgeSchema.parse(body);

  const roundRef = adminDb.collection(ROUNDS_COLLECTION).doc(input.roundId);
  const roundDoc = await roundRef.get();

  if (!roundDoc.exists) {
    throw new AppException('NOT_FOUND', 'Round not found', 404);
  }

  const round = roundDoc.data()!;

  if (round.sessionId !== sessionId) {
    throw new AppException('FORBIDDEN', 'Not your round', 403);
  }

  // Idempotent: if round already completed, return stored results (handles retry after partial failure)
  if (round.status === 'completed') {
    const response: BeatTheAiSubmitResponse = {
      roundId: input.roundId,
      aiResponse: round.aiResponse as string,
      kidScores: round.kidScores,
      aiScores: round.aiScores,
      kidAvgScore: round.kidAvgScore as number,
      aiAvgScore: round.aiAvgScore as number,
      result: round.result,
      feedback: round.feedback,
      aiPointsEarned: round.aiPointsEarned as number,
      skillXpEarned: round.skillXpEarned,
      aiXray: round.aiXray,
      levelUps: round.levelUps ?? [],
    };
    return apiSuccess(response);
  }

  if (round.status !== 'revealed') {
    throw new AppException('INVALID_STATE', 'Round not ready for judging', 400);
  }

  // AI judges both responses
  const judgeResult = await judgeResponses(
    round.prompt as BeatTheAiPrompt,
    round.kidResponse as string,
    round.aiResponse as string,
    round.category,
  );

  const { kidScores, aiScores, feedback } = judgeResult;

  // Calculate scores and result using AI-assigned scores
  const kidAvgScore = calculateAvgScore(kidScores);
  const aiAvgScore = calculateAvgScore(aiScores);
  const result = determineResult(kidAvgScore, aiAvgScore);
  const aiPointsEarned = calculateAiPoints(result);

  const sessionRef = adminDb.collection(SESSIONS_COLLECTION).doc(sessionId);

  // Read session inside transaction so concurrent round completions are serialized
  const { skillXpEarned, levelUps } = await adminDb.runTransaction(async (tx) => {
    const sessionDoc = await tx.get(sessionRef);
    const sessionData = sessionDoc.exists ? sessionDoc.data()! : {};

    // Build current skills from transactional read
    const oldSkills: BeatTheAiSkills = getDefaultSkills();
    if (sessionData.beatTheAiSkills) {
      for (const [id, stored] of Object.entries(sessionData.beatTheAiSkills as Record<string, { xp: number }>)) {
        if (id in oldSkills) {
          oldSkills[id as keyof BeatTheAiSkills] = getSkillLevel(stored.xp);
        }
      }
    }

    // Get current stats for streak calculation
    const stats = sessionData.beatTheAiStats ?? {
      totalRounds: 0, wins: 0, losses: 0, ties: 0,
      currentStreak: 0, longestStreak: 0, byCategory: {},
    };

    // Calculate skill XP earned
    const txSkillXpEarned = calculateSkillXp(
      {
        category: round.category,
        prompt: round.prompt as BeatTheAiPrompt,
        result,
        kidScores: kidScores as BeatTheAiScores,
        timeUsedSeconds: round.timeUsedSeconds as number,
      },
      stats.currentStreak
    );

    // Build updated skills
    const newSkills = { ...oldSkills };
    for (const [skillId, xpGained] of Object.entries(txSkillXpEarned)) {
      const current = newSkills[skillId as BeatTheAiSkillId];
      newSkills[skillId as BeatTheAiSkillId] = getSkillLevel(current.xp + xpGained);
    }

    // Detect level-ups
    const txLevelUps = detectLevelUp(oldSkills, newSkills);

    // Update streak
    const newStreak = result === 'kid_wins' ? stats.currentStreak + 1 : 0;
    const longestStreak = Math.max(stats.longestStreak, newStreak);

    // Update category stats
    const catKey = round.category as string;
    const catStats = stats.byCategory[catKey] ?? { rounds: 0, wins: 0 };

    // Prepare session update
    const skillsForFirestore: Record<string, { xp: number; level: number }> = {};
    for (const [id, skill] of Object.entries(newSkills)) {
      skillsForFirestore[id] = { xp: skill.xp, level: skill.level };
    }

    const updatedStats = {
      totalRounds: stats.totalRounds + 1,
      wins: stats.wins + (result === 'kid_wins' ? 1 : 0),
      losses: stats.losses + (result === 'ai_wins' ? 1 : 0),
      ties: stats.ties + (result === 'tie' ? 1 : 0),
      currentStreak: newStreak,
      longestStreak,
      byCategory: {
        ...stats.byCategory,
        [catKey]: {
          rounds: catStats.rounds + 1,
          wins: catStats.wins + (result === 'kid_wins' ? 1 : 0),
        },
      },
    };

    tx.update(sessionRef, {
      beatTheAiSkills: skillsForFirestore,
      beatTheAiStats: updatedStats,
    });

    tx.update(roundRef, {
      status: 'completed',
      kidScores,
      aiScores,
      kidAvgScore,
      aiAvgScore,
      result,
      feedback,
      skillXpEarned: txSkillXpEarned,
      aiPointsEarned,
      levelUps: txLevelUps,
      completedAt: Timestamp.now(),
    });

    return { skillXpEarned: txSkillXpEarned, levelUps: txLevelUps };
  });

  // Award AI points (separate transaction via existing system)
  await updateSessionPoints(sessionId, {
    action: 'add_points',
    points: aiPointsEarned,
    concept: round.aiXray?.concept,
  });

  const response: BeatTheAiSubmitResponse = {
    roundId: input.roundId,
    aiResponse: round.aiResponse as string,
    kidScores,
    aiScores,
    kidAvgScore,
    aiAvgScore,
    result,
    feedback,
    aiPointsEarned,
    skillXpEarned,
    aiXray: round.aiXray,
    levelUps,
  };

  return apiSuccess(response);
}
