/**
 * Hourly leaderboard refresh.
 *
 * Reads up to 200 recent public creations, aggregates per-session counts,
 * writes the top 5 to `leaderboards/topCreators` as a single doc. Public
 * leaderboard endpoint reads ONE doc instead of scanning 200 every call.
 *
 * At 100K MAU with 1K leaderboard views/hour: saves ~200K Firestore reads
 * per hour vs the inline aggregation.
 */

import type { Context } from '@netlify/functions';

interface LeaderboardEntry {
  sessionId: string;
  creationCount: number;
}

interface LeaderboardCacheDoc {
  entries: LeaderboardEntry[];
  refreshedAt: string;
  windowReads: number;
}

export default async function handler(_req: Request, _ctx: Context): Promise<Response> {
  const { backend } = await import('../../lib/backend');
  const { getTopCreators } = await import('../../lib/repositories/creationRepository');

  try {
    const top = await getTopCreators(5);
    const doc: LeaderboardCacheDoc = {
      entries: top,
      refreshedAt: new Date().toISOString(),
      windowReads: 200, // matches getTopCreators's internal scan size
    };
    // Upsert at a stable id so reads are O(1).
    const existing = await backend.data.get<LeaderboardCacheDoc>('leaderboards', 'topCreators');
    if (existing) {
      await backend.data.update<LeaderboardCacheDoc>('leaderboards', 'topCreators', doc);
    } else {
      await backend.data.create<LeaderboardCacheDoc>('leaderboards', 'topCreators', doc);
    }
    return new Response(`OK — refreshed ${top.length} entries`, { status: 200 });
  } catch (err) {
    console.error('[leaderboard-refresh] failed:', err);
    return new Response('Refresh failed', { status: 500 });
  }
}
