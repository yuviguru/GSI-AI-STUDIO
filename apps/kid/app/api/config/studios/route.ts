import { NextResponse } from 'next/server';
import { getStudioLaunchStates } from '@/lib/config/studioLaunchState';

/**
 * GET /api/config/studios — resolved studio launch-state map (LAUNCH-001).
 *
 * Returns the in-code defaults merged with any Firestore override from
 * `config/studios`. Drives the LIVE/BETA/COMING_SOON pill on studio cards
 * across the app. Public — no auth required (display config, same risk
 * profile as /api/billing/costs).
 *
 * The resolver itself swallows Firestore errors and falls back to defaults,
 * so this endpoint should never 5xx in practice.
 */
export async function GET() {
  const config = await getStudioLaunchStates();
  return NextResponse.json(
    { success: true, data: config, error: null },
    {
      // 60s freshness window means a Firebase-console flag flip propagates
      // within ~60s of the next page load. Matches /api/billing/costs.
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    },
  );
}
