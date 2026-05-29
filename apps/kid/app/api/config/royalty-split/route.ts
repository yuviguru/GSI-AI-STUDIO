import { NextResponse } from 'next/server';
import { getRoyaltySplit } from '@/lib/config/royaltySplit';

/**
 * GET /api/config/royalty-split (BOOK-004 Phase 1)
 *
 * Returns the resolved royalty-split config — defaults merged with any
 * Firestore override from `config/royaltySplit`. Drives the live preview
 * on `SalesConfigForm` in PublishModal so the kid sees the same numbers
 * the server will charge.
 *
 * Public read. 60s cache + SWR matches the LAUNCH-001 / billing-costs pattern.
 */
export async function GET() {
  const config = await getRoyaltySplit();
  return NextResponse.json(
    { success: true, data: config, error: null },
    {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    },
  );
}
