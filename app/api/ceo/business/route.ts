import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import {
  getCeoBusiness,
  getActiveBusinessForSession,
  getPendingEventForBusiness,
  listDecidedEventsForBusiness,
} from '@/lib/firebase/ceoService';
import type { CeoBusiness, CeoEvent } from '@/types';

/**
 * GET /api/ceo/business
 * Get the current business state + pending event + recent decision history.
 * If ?businessId is omitted, returns the most recent ACTIVE business for the
 * session. 404s if the session has no active business.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const businessId = new URL(request.url).searchParams.get('businessId');

    let business: CeoBusiness;
    if (businessId) {
      business = await getCeoBusiness(businessId);
      if (business.sessionId !== sessionId) {
        throw new AppException('FORBIDDEN', 'Business belongs to a different session', 403);
      }
    } else {
      const active = await getActiveBusinessForSession(sessionId);
      if (!active) {
        throw new AppException('NOT_FOUND', 'No active business. Register one first!', 404);
      }
      business = active;
    }

    const pendingEvent = await getPendingEventForBusiness(business.id);

    // listDecidedEventsForBusiness(businessId, limit) returns events ordered by
    // decisionTimestamp ASC. Reverse so the response surfaces most-recent first.
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
