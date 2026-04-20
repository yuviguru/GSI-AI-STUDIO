import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoDecideSchema } from '@/lib/validators';
import { filterOutput } from '@/lib/safety/inputFilter';
import {
  getCeoBusiness,
  getCeoEvent,
  getCeoProfileByBusiness,
  recordEventDecision,
  advanceBusinessPhase,
  saveCeoEvent,
} from '@/lib/firebase/ceoService';
import { updateSessionPoints } from '@/lib/firebase/sessionService';
import { applyStateChanges } from '@/lib/ceo/businessState';
import { applyScoreAdjustments } from '@/lib/ceo/profileEngine';
import { scoreDecision } from '@/lib/ceo/scoringEngine';
import { generateEvent } from '@/lib/ceo/eventEngine';
import { isPhaseComplete, pickNextMilestone } from '@/lib/ceo/phases';
import { CEO_AI_POINTS } from '@/lib/ceo/constants';
import type { CeoBusiness, CeoEvent } from '@/types';

/**
 * POST /api/ceo/decide
 *
 * Submit a choice on an event. Scores the decision, applies state + profile
 * updates atomically, advances the phase if complete, generates the next
 * event, and awards AI Points.
 *
 * Auth: Firebase Bearer + X-Active-Kid-Id. Kid must own the event.
 */
export async function POST(request: NextRequest) {
  try {
    const { kidId } = await requireAuthWithKid(request);

    // AI Points still live on the parent user's session counter, since that's
    // the cross-kid gamification aggregate. Accept X-Session-Id optionally; fall
    // back to the active kid id as the points key if missing.
    const sessionId = request.headers.get('X-Session-Id') ?? kidId;

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

    let latestBusiness: CeoBusiness = postDecisionBusiness;
    let phaseAdvanced = false;
    if (
      event.milestone &&
      isPhaseComplete(latestBusiness.phase, latestBusiness.phaseMilestones)
    ) {
      latestBusiness = await advanceBusinessPhase(business.id);
      phaseAdvanced = true;
    }

    let nextEvent: CeoEvent | null = null;
    if (latestBusiness.status === 'active') {
      const nextMilestone = pickNextMilestone(latestBusiness.phase, latestBusiness.phaseMilestones);
      const generated = await generateEvent({ business: latestBusiness, milestone: nextMilestone });
      nextEvent = await saveCeoEvent({ ...generated, deliveredVia: 'web' });
    }

    let aiPointsEarned = CEO_AI_POINTS.MAKE_DECISION;
    if (event.milestone) aiPointsEarned += CEO_AI_POINTS.COMPLETE_MILESTONE;
    if (phaseAdvanced) aiPointsEarned += CEO_AI_POINTS.COMPLETE_PHASE;
    if (latestBusiness.status === 'completed') aiPointsEarned += CEO_AI_POINTS.COMPLETE_SIMULATION;

    let newBadges: string[] = [];
    try {
      const pointsResult = await updateSessionPoints(sessionId, {
        action: 'add_points',
        points: aiPointsEarned,
      });
      newBadges = pointsResult.newBadges;
    } catch (err) {
      console.error('[ceo/decide] updateSessionPoints failed:', (err as Error).message);
      // Decision is already saved — don't reject the response over a
      // best-effort points write. Kid just won't see the +X toast.
    }

    return apiSuccess({
      scores: scoring.scores,
      feedback: safeFeedback,
      updatedBusiness: latestBusiness,
      nextEvent,
      phaseAdvanced,
      milestoneResolved: event.milestone ?? null,
      aiPointsEarned,
      newBadges,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
