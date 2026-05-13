import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoDecideSchema } from '@/lib/validators';
import { filterOutput } from '@/lib/safety/inputFilter';
import {
  getCeoBusiness,
  getCeoEvent,
  getCeoProfileByBusiness,
  listDecidedEventsForBusiness,
  recordEventDecision,
  advanceBusinessPhase,
  saveCeoEvent,
  saveCeoProfileEnding,
  reserveRegularEventSlot,
  releaseRegularEventSlot,
  getRecentEventsForBusiness,
} from '@/lib/firebase/ceoService';
import { updateKidPoints } from '@/lib/firebase/sessionService';
import { applyStateChanges } from '@/lib/ceo/businessState';
import { applyScoreAdjustments } from '@/lib/ceo/profileEngine';
import { scoreDecision } from '@/lib/ceo/scoringEngine';
import { generateRegularEvent } from '@/lib/ceo/eventEngine';
import { generateEndingReport } from '@/lib/ceo/endingReport';
import { isPhaseComplete } from '@/lib/ceo/phases';
import { CEO_AI_POINTS, REGULAR_EVENTS_PER_DAY_CAP } from '@/lib/ceo/constants';
import type { CeoBusiness, CeoEvent } from '@gsi/types';

/**
 * POST /api/ceo/decide
 *
 * Submit a choice on an event. Scores the decision, applies state + profile
 * updates atomically, optionally advances the phase, optionally auto-
 * generates a follow-up REGULAR event, and awards AI Points.
 *
 * Phase 3 Daily Rhythm (D4 — hybrid auto-chain):
 * - Phase advance is gated on `event.eventType === 'milestone'`. Regular
 *   events never advance a phase.
 * - After a MILESTONE decision, no next event is generated here — the kid
 *   picks "Take a small decision" or waits for tomorrow's 18:30 IST tick.
 *   This keeps the milestone feeling like the day's anchor.
 * - After a REGULAR decision, we auto-chain another regular event IF the
 *   kid is under the daily cap (5 / business / IST day). At the cap,
 *   nextEvent is null and the response carries `regularCapHit: true` so
 *   the UI shows "All 5 done — resets at midnight IST".
 * - Points are split by event type: milestone decision = 10 base, regular
 *   decision = 3 base. Phase / simulation bonuses layer on top of both.
 *
 * Auth: Firebase Bearer + X-Active-Kid-Id. Kid must own the event.
 */
export async function POST(request: NextRequest) {
  try {
    const { kidId } = await requireAuthWithKid(request);

    const body = await request.json();
    const { eventId, choiceId, responseTimeSeconds } = ceoDecideSchema.parse(body);

    const event = await getCeoEvent(eventId);
    if (event.kidId !== kidId) {
      throw new AppException('FORBIDDEN', 'Not your event', 403);
    }
    if (event.status !== 'pending') {
      throw new AppException('ALREADY_DECIDED', 'This event has already been decided', 400);
    }

    const chosen = event.choices.find((c) => c.id === choiceId);
    if (!chosen) {
      throw new AppException('INVALID_INPUT', `Unknown choice ${choiceId}`, 400);
    }

    const [business, profile] = await Promise.all([
      getCeoBusiness(event.businessId),
      getCeoProfileByBusiness(event.businessId),
    ]);

    const scoring = await scoreDecision({
      event,
      choiceId,
      responseTimeSeconds,
      business,
    });
    const safeFeedback = filterOutput(scoring.reasoning);

    const nextBusinessMath = applyStateChanges(business, scoring.state_changes);
    const nextDimensions = applyScoreAdjustments(profile.dimensions, scoring.scores);

    const businessStateUpdates: Partial<CeoBusiness> = {
      currentCash: nextBusinessMath.currentCash,
      reputation: nextBusinessMath.reputation,
      morale: nextBusinessMath.morale,
    };

    const { business: postDecisionBusiness } = await recordEventDecision({
      eventId,
      businessId: business.id,
      choiceId,
      choiceText: chosen.text,
      responseTimeSeconds,
      scores: scoring.scores,
      feedback: safeFeedback,
      milestoneResolved: event.milestone ?? null,
      businessStateUpdates,
      profileDimensionUpdates: nextDimensions,
    });

    // ── Phase advance — milestone events only ────────────────────────
    // docToCeoEvent shim coerces legacy events without an eventType (milestone
    // set → 'milestone', else 'regular'), so this check is safe for old data.
    const isMilestoneDecision =
      (event.eventType ?? (event.milestone ? 'milestone' : 'regular')) === 'milestone';

    let latestBusiness: CeoBusiness = postDecisionBusiness;
    let phaseAdvanced = false;
    if (
      isMilestoneDecision &&
      event.milestone &&
      isPhaseComplete(latestBusiness.phase, latestBusiness.phaseMilestones)
    ) {
      latestBusiness = await advanceBusinessPhase(business.id);
      phaseAdvanced = true;
    }

    // ── Next event — regular cadence only; milestones wait for cron ──
    // Critical invariant: the decision above is ALREADY committed. Any
    // failure in this block (LLM blip, Firestore hiccup, cap-reservation
    // error) must NOT surface as a 500 — otherwise the client retries into
    // ALREADY_DECIDED, loses the points/badges/ending-report that follow,
    // and the decision becomes non-idempotent from the kid's perspective.
    // So: swallow everything here, log, and fall through. The kid sees
    // nextEvent: null and can poll /api/ceo/event for their next regular.
    let nextEvent: CeoEvent | null = null;
    let regularEventsToday = latestBusiness.dailyRegularEventCount ?? 0;
    let regularCapHit = false;
    let nextEventFailed = false;

    if (latestBusiness.status === 'active' && !isMilestoneDecision) {
      try {
        // Kid just decided a REGULAR event — try to reserve the next slot.
        const reservation = await reserveRegularEventSlot(
          latestBusiness.id,
          REGULAR_EVENTS_PER_DAY_CAP,
        );
        regularEventsToday = reservation.countToday;
        if (reservation.allowed) {
          try {
            const recent = await getRecentEventsForBusiness(latestBusiness.id, 5);
            const recentEventTitles = recent.map((e) => e.title);
            const generated = await generateRegularEvent({
              business: latestBusiness,
              recentEventTitles,
            });
            nextEvent = await saveCeoEvent({ ...generated, deliveredVia: 'web' });
          } catch (genErr) {
            // Generation/save failed AFTER we reserved — release the slot
            // so the kid isn't penalised for a transient error they can't
            // see. If the release itself fails, at worst the kid loses 1 of
            // 5 slots today (same UX as Codex P2 guidance).
            nextEventFailed = true;
            console.error(
              '[ceo/decide] next regular event generation failed, releasing slot:',
              (genErr as Error).message,
            );
            try {
              const released = await releaseRegularEventSlot(latestBusiness.id);
              regularEventsToday = released.countToday;
            } catch (relErr) {
              console.error(
                '[ceo/decide] slot release failed (kid may lose one slot today):',
                (relErr as Error).message,
              );
            }
          }
        } else {
          regularCapHit = true;
        }
      } catch (resErr) {
        // Reservation itself failed before the slot was consumed — nothing
        // to release. Just log and proceed with nextEvent: null.
        nextEventFailed = true;
        console.error(
          '[ceo/decide] regular-event slot reservation failed:',
          (resErr as Error).message,
        );
      }
    }

    // ── Points — split by event type ─────────────────────────────────
    let aiPointsEarned = isMilestoneDecision
      ? CEO_AI_POINTS.MAKE_DECISION_MILESTONE
      : CEO_AI_POINTS.MAKE_DECISION_REGULAR;
    if (isMilestoneDecision && event.milestone) {
      aiPointsEarned += CEO_AI_POINTS.COMPLETE_MILESTONE;
    }
    if (phaseAdvanced) aiPointsEarned += CEO_AI_POINTS.COMPLETE_PHASE;
    if (latestBusiness.status === 'completed') aiPointsEarned += CEO_AI_POINTS.COMPLETE_SIMULATION;

    let newBadges: string[] = [];
    try {
      // Kid CEO is authenticated-only — points live on the kid doc, not the
      // anonymous session. This is what feeds the web UI's points display
      // (hydrated from `activeKid.aiPoints`) so kids actually see their
      // running total tick up after a decision.
      const pointsResult = await updateKidPoints(kidId, {
        action: 'add_points',
        points: aiPointsEarned,
      });
      newBadges = pointsResult.newBadges;
    } catch (err) {
      console.error('[ceo/decide] updateKidPoints failed:', (err as Error).message);
      // Decision is already saved — don't reject the response over a
      // best-effort points write. Kid just won't see the +X toast.
    }

    // ── Ending report — fire-and-forget on simulation completion ─────
    // Generating the report calls the LLM (2s+) so we DO NOT await — the
    // kid's decide response stays fast and the report lands in Firestore
    // shortly after. Re-fetch the profile because recordEventDecision
    // updated its dimensions inside the transaction above.
    if (latestBusiness.status === 'completed') {
      const businessId = latestBusiness.id;
      void (async () => {
        try {
          const [freshProfile, decidedEvents] = await Promise.all([
            getCeoProfileByBusiness(businessId),
            listDecidedEventsForBusiness(businessId, 200),
          ]);
          const ending = await generateEndingReport({
            business: latestBusiness,
            profile: freshProfile,
            decidedEvents,
          });
          await saveCeoProfileEnding(freshProfile.id, ending);
        } catch (err) {
          // Report is a post-completion enhancement — failure must never
          // crash the node process or leak back to the kid. Log + swallow.
          console.error(
            '[ceo/decide] ending report generation failed:',
            (err as Error).message,
          );
        }
      })();
    }

    return apiSuccess({
      scores: scoring.scores,
      feedback: safeFeedback,
      updatedBusiness: latestBusiness,
      nextEvent,
      phaseAdvanced,
      milestoneResolved: event.milestone ?? null,
      decidedEventType: isMilestoneDecision ? ('milestone' as const) : ('regular' as const),
      regularEventsToday,
      regularEventsCap: REGULAR_EVENTS_PER_DAY_CAP,
      regularCapHit,
      // Signals to the client that the decision was saved + points/badges
      // applied, but the auto-follow-up next event couldn't be generated.
      // Client should either poll /api/ceo/event for a retry or show a
      // friendly "we'll have your next one in a moment" nudge.
      nextEventFailed,
      aiPointsEarned,
      newBadges,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
