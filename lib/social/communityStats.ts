/**
 * Community stats resolver (COMMUNITY-001) — server side.
 *
 * Combines:
 *  - Real cumulative creation counts (Firestore `.count()` aggregations
 *    on `creations` and `books`, cached 5 min in-process so we don't
 *    re-aggregate on every request).
 *  - Synthetic "creators online" count from `onlineCounter` (refresh-stable
 *    deterministic curve; replaced by real telemetry in a future story).
 *
 * Errors are swallowed and the cumulative count falls back to the last
 * known value (or 0 on cold start). The synthetic number never throws.
 */

import { adminDb } from '@gsi/firebase';
import {
  getSyntheticOnlineCount,
  type CommunityScope,
} from './onlineCounter';

interface CacheEntry {
  value: number;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

/** Coarse mapping from a community scope to the (collection, optional type)
 *  pair used to count real lifetime creations. */
function describeScope(scope: CommunityScope): Array<{
  collection: 'creations' | 'books';
  type?: string;
}> {
  if (scope === 'global') {
    // Lifetime across all studios = creations + books
    return [{ collection: 'creations' }, { collection: 'books' }];
  }
  if (scope === 'book') {
    return [{ collection: 'books' }];
  }
  return [{ collection: 'creations', type: scope }];
}

async function countWithCache(cacheKey: string, runQuery: () => Promise<number>): Promise<number> {
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  try {
    const value = await runQuery();
    cache.set(cacheKey, { value, expiresAt: now + TTL_MS });
    return value;
  } catch (err) {
    // Outage path: serve the last known value if we have one, else 0.
    // Never throw — community stats are a nice-to-have, not critical.
    console.warn(`[communityStats] count failed for ${cacheKey}, using fallback:`, err);
    return cached?.value ?? 0;
  }
}

/** Count documents in a collection (optionally filtered by `type`). Uses
 *  Firestore aggregation `.count()` — single read, returns just the number. */
async function countDocs(collection: 'creations' | 'books', type?: string): Promise<number> {
  let query: FirebaseFirestore.Query = adminDb.collection(collection);
  if (type) {
    query = query.where('type', '==', type);
  }
  const snap = await query.count().get();
  return snap.data().count;
}

export interface CommunityStats {
  scope: CommunityScope;
  /** Real cumulative count from Firestore (cached 5 min). */
  creationsLifetime: number;
  /** Synthetic "creators online" — deterministic per 5-min bucket. */
  onlineNow: number;
  /** True if `onlineNow` is currently synthetic. Flip to false when the
   *  real telemetry-backed implementation replaces it. Exposed so the UI
   *  can choose to add a small "approx" hint when synthetic. */
  onlineIsSynthetic: boolean;
}

/** Public entry point. Always returns a usable result, never throws. */
export async function getCommunityStats(scope: CommunityScope): Promise<CommunityStats> {
  const sources = describeScope(scope);
  const counts = await Promise.all(
    sources.map((s) => {
      const key = s.type ? `${s.collection}:${s.type}` : s.collection;
      return countWithCache(key, () => countDocs(s.collection, s.type));
    }),
  );
  const creationsLifetime = counts.reduce((sum, n) => sum + n, 0);
  const onlineNow = getSyntheticOnlineCount(scope);
  return {
    scope,
    creationsLifetime,
    onlineNow,
    onlineIsSynthetic: true,
  };
}

/** Exposed for tests to reset cache between cases. */
export function __resetCacheForTests(): void {
  cache.clear();
}
