import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { beatTheAiStartSchema } from '@/lib/validators';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getRandomPrompt } from '@/lib/beat-the-ai/prompts';
import { getAiDifficulty, getDefaultSkills, getSkillLevel } from '@/lib/beat-the-ai/skillEngine';
import type { BeatTheAiSkills, BeatTheAiStartResponse } from '@gsi/types';

const ROUNDS_COLLECTION = 'beatTheAiRounds';
const SESSIONS_COLLECTION = 'sessions';
const MAX_ROUNDS_PER_DAY = 5;

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const body = await request.json();
    const input = beatTheAiStartSchema.parse(body);

    // Rate limit: count today's rounds for this session
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayRounds = await adminDb
      .collection(ROUNDS_COLLECTION)
      .where('sessionId', '==', sessionId)
      .where('createdAt', '>=', Timestamp.fromDate(todayStart))
      .count()
      .get();

    if (todayRounds.data().count >= MAX_ROUNDS_PER_DAY) {
      throw new AppException(
        'RATE_LIMITED',
        "You've used all 5 challenges for today. Come back tomorrow for more!",
        429
      );
    }

    // Load session skills to determine AI difficulty
    const sessionDoc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    let skills: BeatTheAiSkills = getDefaultSkills();

    if (sessionDoc.exists) {
      const data = sessionDoc.data();
      if (data?.beatTheAiSkills) {
        // Reconstruct skills from stored data
        for (const [id, stored] of Object.entries(data.beatTheAiSkills as Record<string, { xp: number }>)) {
          if (id in skills) {
            skills[id as keyof BeatTheAiSkills] = getSkillLevel(stored.xp);
          }
        }
      }
    }

    const aiDifficulty = getAiDifficulty(skills);
    const prompt = getRandomPrompt(input.category);

    // Create pending round in Firestore
    const roundRef = adminDb.collection(ROUNDS_COLLECTION).doc();
    await roundRef.set({
      id: roundRef.id,
      status: 'pending',
      category: input.category,
      prompt,
      aiDifficulty,
      sessionId,
      createdAt: Timestamp.now(),
    });

    const response: BeatTheAiStartResponse = {
      roundId: roundRef.id,
      prompt,
      aiDifficulty,
    };

    return apiSuccess(response);
  } catch (error) {
    return handleApiError(error);
  }
}
