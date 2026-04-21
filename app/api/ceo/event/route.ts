import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoEventRequestSchema } from '@/lib/validators';
import {
  getCeoBusiness,
  getPendingEventForBusiness,
  saveCeoEvent,
} from '@/lib/firebase/ceoService';
import { generateEvent } from '@/lib/ceo/eventEngine';
import { pickNextMilestone } from '@/lib/ceo/phases';

/**
 * POST /api/ceo/event
 * Generate the next milestone-steered event for a business, or return the
 * existing pending event if one is already outstanding (idempotent).
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

    // Idempotency: if a pending event already exists, return it unchanged so
    // repeated polls don't spam the LLM or create duplicate events.
    const pending = await getPendingEventForBusiness(businessId);
    if (pending) {
      return apiSuccess({ event: pending, pendingDecisionExists: true });
    }

    if (business.status !== 'active') {
      throw new AppException(
        'NOT_FOUND',
        'This business is no longer active',
        404,
      );
    }

    // Milestone may be null if the current phase is complete but hasn't been
    // advanced yet (rare edge case — the decide endpoint normally handles
    // phase progression). Fall through to generateEvent with null so it
    // produces a freeform event rather than crashing; the next decision will
    // advance the phase.
    const milestone = pickNextMilestone(business.phase, business.phaseMilestones);

    let generated;
    try {
      generated = await generateEvent({ business, milestone });
    } catch (genErr) {
      console.error('[ceo/event] generateEvent failed:', genErr);
      throw new AppException(
        'AI_GENERATION_FAILED',
        'Could not generate the next event. Try again in a moment.',
        502,
      );
    }

    const saved = await saveCeoEvent({ ...generated, deliveredVia: 'web' });

    return apiSuccess({ event: saved, pendingDecisionExists: false });
  } catch (error) {
    return handleApiError(error);
  }
}
