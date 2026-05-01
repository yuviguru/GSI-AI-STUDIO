import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { adminDb } from '@/lib/firebase/admin';

// Always evaluate at runtime — leaderboard data changes constantly and
// build-time prerender would otherwise cache an empty response.
export const dynamic = 'force-dynamic';

const LIMIT = 20;
const COLLECTION = 'kids';

export interface LeaderboardEntry {
  rank: number;
  kidId: string;
  name: string;
  avatar: string | null;
  mascotId: string | null;
  score: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  /** True if Firestore returned at least one record. False = mock fallback used by the client. */
  fromFirestore: boolean;
}

/**
 * GET /api/leaderboard
 * Returns the top N kids by AI Points, anonymized to first-name + last-initial.
 *
 * Falls back gracefully if Firestore is unavailable — clients show a friendly
 * mocked podium instead of an error.
 */
export async function GET(_request: NextRequest) {
  try {
    let entries: LeaderboardEntry[] = [];
    let fromFirestore = false;

    try {
      const snap = await adminDb
        .collection(COLLECTION)
        .orderBy('aiPoints', 'desc')
        .limit(LIMIT)
        .get();

      entries = snap.docs
        .map((doc, idx) => {
          const data = doc.data() as {
            name?: string;
            aiPoints?: number;
            avatar?: string;
            mascotId?: string;
          };
          return {
            rank: idx + 1,
            kidId: doc.id,
            name: anonymize(data.name ?? 'Anonymous'),
            avatar: data.avatar ?? null,
            mascotId: data.mascotId ?? null,
            score: data.aiPoints ?? 0,
          };
        })
        .filter((e) => e.score > 0);

      fromFirestore = entries.length > 0;
    } catch (err) {
      console.warn(
        '[leaderboard] Firestore query failed — returning empty list (client falls back to mock):',
        err instanceof Error ? err.message : err,
      );
      entries = [];
    }

    const response: LeaderboardResponse = { entries, fromFirestore };
    return apiSuccess(response);
  } catch (error) {
    return handleApiError(error);
  }
}

/** "Priya Sharma" → "Priya S." */
function anonymize(name: string): string {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}
