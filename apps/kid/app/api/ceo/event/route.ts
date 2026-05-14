import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoEventRequestSchema } from '@/lib/validators';
import {
  getCeoBusiness,
  getPendingRegularForBusiness,
  saveCeoEvent,
  reserveRegularEventSlot,
  releaseRegularEventSlot,
  getRecentEventsForBusiness,
} from '@gsi/firebase/ceoService';
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

    // Phase 3 Daily Rhythm: this endpoint only deals with REGULAR events
    // (pull model). A pending MILESTONE should NOT short-circuit the pull
    // — the two pending slots are independent. We only check for a pending
    // regular.
    const pendingRegular = await getPendingRegularForBusiness(businessId);
    if (pendingRegular) {
      return apiSuccess({
        event: pendingRegular,
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
    // a generation we're about to throw away. If generation or save fails,
    // we release the slot so the kid doesn't lose a day-cap credit to a
    // transient error they can't see.
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

    let saved;
    try {
      const generated = await generateRegularEvent({ business, recentEventTitles });
      saved = await saveCeoEvent({ ...generated, deliveredVia: 'web' });
    } catch (genErr) {
      console.error('[ceo/event] generateRegularEvent failed, releasing slot:', genErr);
      // Best-effort release so the kid keeps their slot. If the release
      // itself fails the worst case is the kid loses one slot today — we
      // swallow the error and surface the ORIGINAL generation failure.
      try {
        await releaseRegularEventSlot(businessId);
      } catch (relErr) {
        console.error(
          '[ceo/event] slot release after gen failure also failed:',
          (relErr as Error).message,
        );
      }
      throw new AppException(
        'AI_GENERATION_FAILED',
        'Could not generate the next event. Try again in a moment.',
        502,
      );
    }

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
