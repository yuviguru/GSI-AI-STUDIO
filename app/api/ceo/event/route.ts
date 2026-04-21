import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoEventRequestSchema } from '@/lib/validators';
import {
  getCeoBusiness,
  getPendingEventForBusiness,
  saveCeoEvent,
  reserveRegularEventSlot,
  getRecentEventsForBusiness,
} from '@/lib/firebase/ceoService';
import { generateRegularEvent } from '@/lib/ceo/eventEngine';
import { REGULAR_EVENTS_PER_DAY_CAP } from '@/lib/ceo/constants';

/**
 * POST /api/ceo/event
 *
 * Regular-event mint endpoint. Called by the kid when they open /ceo and
 * want something to do between milestone beats.
 *
 * PR2: this endpoint ONLY mints regular (small-stakes, non-phase-advancing)
 * events. Milestone events are delivered by the scheduled cron — kids
 * don't trigger them by polling. The 5-per-UTC-day cap is enforced here.
 *
 * Responses:
 * - `event: {…}, pendingDecisionExists: true`  — an unresolved event was
 *   already outstanding (idempotent), returned unchanged. Does NOT count
 *   against the daily cap (reservation only fires when we actually mint).
 * - `event: {…}, pendingDecisionExists: false` — a fresh regular event
 *   was minted. `regularEventsToday` reflects the post-mint count.
 * - `event: null, regularCapHit: true` — kid has used all 5 regular slots
 *   today. UI should show "Come back tomorrow for your Big Choice".
 */
export async function POST(request: NextRequest) {
  try {
    const { kidId } = await requireAuthWithKid(request);

    const body = await request.json();
    const { businessId } = ceoEventRequestSchema.parse(body);

    const business = await getCeoBusiness(businessId);
    if (business.kidId !== kidId) {
      throw new AppException('FORBIDDEN', 'You do not own this business', 403);
    }

    // Idempotency: if a pending event already exists (could be a regular OR
    // a milestone delivered by the cron), return it unchanged so repeated
    // polls don't spam the LLM or duplicate events. Does not touch the cap.
    const pending = await getPendingEventForBusiness(businessId);
    if (pending) {
      return apiSuccess({
        event: pending,
        pendingDecisionExists: true,
        regularEventsToday: business.dailyRegularEventCount ?? 0,
        regularEventsCap: REGULAR_EVENTS_PER_DAY_CAP,
        regularCapHit: false,
      });
    }

    if (business.status !== 'active') {
      throw new AppException(
        'NOT_FOUND',
        'This business is no longer active',
        404,
      );
    }

    // Reserve a daily-cap slot BEFORE hitting the LLM so a kid who's at the
    // cap gets a fast "come back tomorrow" response instead of paying for
    // a generation we're about to throw away.
    const reservation = await reserveRegularEventSlot(businessId, REGULAR_EVENTS_PER_DAY_CAP);
    if (!reservation.allowed) {
      return apiSuccess({
        event: null,
        pendingDecisionExists: false,
        regularEventsToday: reservation.countToday,
        regularEventsCap: reservation.cap,
        regularCapHit: true,
      });
    }

    const recent = await getRecentEventsForBusiness(businessId, 5);
    const recentEventTitles = recent.map((e) => e.title);

    let generated;
    try {
      generated = await generateRegularEvent({ business, recentEventTitles });
    } catch (genErr) {
      console.error('[ceo/event] generateRegularEvent failed:', genErr);
      throw new AppException(
        'AI_GENERATION_FAILED',
        'Could not generate the next event. Try again in a moment.',
        502,
      );
    }

    const saved = await saveCeoEvent({ ...generated, deliveredVia: 'web' });

    return apiSuccess({
      event: saved,
      pendingDecisionExists: false,
      regularEventsToday: reservation.countToday,
      regularEventsCap: reservation.cap,
      regularCapHit: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
