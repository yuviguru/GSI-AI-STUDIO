import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import {
  getCeoBusiness,
  getActiveBusinessForKid,
  getPendingEventForBusiness,
  listDecidedEventsForBusiness,
} from '@/lib/firebase/ceoService';
import type { CeoBusiness, CeoEvent } from '@/types';

/**
 * GET /api/ceo/business
 * Returns the current business state + pending event + recent decision history
 * for the authenticated user's active kid profile.
 *
 * If `?businessId` is omitted, returns the most recent ACTIVE business for the
 * kid. 404s if the kid has no active business.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);

    const businessId = new URL(request.url).searchParams.get('businessId');

    let business: CeoBusiness;
    if (businessId) {
      business = await getCeoBusiness(businessId);
      if (business.kidId !== kidId || business.userId !== userId) {
        throw new AppException('FORBIDDEN', 'Business belongs to a different kid', 403);
      }
    } else {
      const active = await getActiveBusinessForKid(kidId);
      if (!active) {
        throw new AppException('NOT_FOUND', 'No active business. Register one first!', 404);
      }
      business = active;
    }

    const pendingEvent = await getPendingEventForBusiness(business.id);

    // listDecidedEventsForBusiness returns events ordered by decisionTimestamp
    // ASC. Reverse so the response surfaces most-recent-first.
    const decidedEvents = await listDecidedEventsForBusiness(business.id, 20);
    const decisionHistory = decidedEvents
      .filter((event): event is CeoEvent & { decidedChoice: NonNullable<CeoEvent['decidedChoice']> } =>
        event.decidedChoice != null,
      )
      .map((event) => {
        const chosen = event.choices.find((c) => c.id === event.decidedChoice);
        return {
          event,
          decision: {
            choiceId: event.decidedChoice,
            choiceText: chosen?.text ?? '',
            scores: event.scores,
            feedback: event.feedback,
            timestamp: event.decisionTimestamp,
          },
        };
      })
      .reverse();

    return apiSuccess({ business, pendingEvent, decisionHistory });
  } catch (error) {
    return handleApiError(error);
  }
}
