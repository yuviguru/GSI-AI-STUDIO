import { NextRequest, NextResponse } from 'next/server';
import { STUDIO_IDS } from '@gsi/types';
import { getCommunityStats } from '@/lib/social/communityStats';
import type { CommunityScope } from '@/lib/social/onlineCounter';

/**
 * GET /api/community/stats?scope=global|book|story|music|quiz|comic|game
 *
 * Returns { creationsLifetime, onlineNow, scope, onlineIsSynthetic }.
 * Cached 60s at the edge — the underlying count is cached 5 min in-process
 * so a Firestore aggregation runs at most ~12 times per scope per hour.
 *
 * Public read — no auth needed. Synthetic baseline never throws; real count
 * falls back to last-known or 0 on Firestore outage.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const scopeParam = url.searchParams.get('scope') ?? 'global';
  const scope: CommunityScope =
    scopeParam === 'global' || (STUDIO_IDS as readonly string[]).includes(scopeParam)
      ? (scopeParam as CommunityScope)
      : 'global';
  const stats = await getCommunityStats(scope);
  return NextResponse.json(
    { success: true, data: stats, error: null },
    {
      // 60s cache — the synthetic curve shifts on 5-min boundaries anyway,
      // so a 60s edge cache won't make the number feel stale.
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    },
  );
}
