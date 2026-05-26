import { NextResponse } from 'next/server';
import { listCosts } from '@/lib/billing';

/**
 * GET /api/billing/costs — server-resolved feature → credit costs.
 *
 * The client otherwise reads from `lib/billing/creditCostsDefaults.ts`
 * (static, env overrides not applied). This endpoint exposes the
 * actual costs the server will charge, including any `CREDIT_COST_*`
 * env overrides ops set for promos. Hooks can subscribe via SWR and
 * fall back to the static defaults until the fetch resolves —
 * eliminates the cost-label-vs-server drift during promos.
 *
 * Public — no auth required. The cost map isn't sensitive.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: { costs: listCosts() },
      error: null,
    },
    {
      // Modest cache so a busy page doesn't re-hit on every studio mount.
      // ops can still override mid-flight by waiting up to 60s; acceptable.
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    },
  );
}
