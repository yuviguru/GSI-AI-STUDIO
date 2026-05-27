import { NextResponse } from 'next/server';
import { listTopups } from '@/lib/billing/razorpay';

/**
 * GET /api/billing/topups — public list of available topup SKUs.
 *
 * Lets the frontend render the buy-credits UI without hardcoding the
 * catalog. Reading from the server also means ops can re-price via the
 * TOPUP_CREDITS_*_INR env vars and the change shows up on the next
 * page load — no frontend deploy needed.
 *
 * Returns prices in INR (rupees, not paise) so the UI can show
 * "₹199" directly.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: { topups: listTopups() },
    error: null,
  });
}
