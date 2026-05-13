import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminDb } from '@gsi/firebase/admin';
import type { BeatTheAiCategory, BeatTheAiStats } from '@gsi/types';

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
    const raw = data.beatTheAiStats;

    if (!raw || raw.totalRounds === 0) {
      const empty: BeatTheAiStats = {
        totalRounds: 0, wins: 0, losses: 0, ties: 0,
        winRate: 0, currentStreak: 0, longestStreak: 0,
        favoriteCategory: null, totalPointsEarned: 0, byCategory: {},
      };
      return apiSuccess(empty);
    }

    // Find favorite category (most rounds played)
    let favoriteCategory: BeatTheAiCategory | null = null;
    let maxRounds = 0;
    for (const [cat, stats] of Object.entries(raw.byCategory ?? {})) {
      const s = stats as { rounds: number; wins: number };
      if (s.rounds > maxRounds) {
        maxRounds = s.rounds;
        favoriteCategory = cat as BeatTheAiCategory;
      }
    }

    // Calculate total points from all rounds (approximate from wins/total)
    const totalPointsEarned = raw.wins * 25 + (raw.totalRounds - raw.wins) * 15;

    const stats: BeatTheAiStats = {
      totalRounds: raw.totalRounds,
      wins: raw.wins,
      losses: raw.losses,
      ties: raw.ties,
      winRate: raw.totalRounds > 0 ? Math.round((raw.wins / raw.totalRounds) * 100) : 0,
      currentStreak: raw.currentStreak,
      longestStreak: raw.longestStreak,
      favoriteCategory,
      totalPointsEarned,
      byCategory: raw.byCategory ?? {},
    };

    return apiSuccess(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
