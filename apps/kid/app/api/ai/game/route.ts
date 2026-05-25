/**
 * POST /api/ai/game — thin HTTP wrapper around the createGame capability.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { gameInputSchema } from '@/lib/validators';
import { checkRateLimit, enforceIpRateLimit } from '@gsi/firebase/sessionService';
import { createGame } from '@/lib/capabilities/createGame';
import { assertEntitled, resolveBillingContext, toAppException } from '@/lib/billing';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const input = gameInputSchema.parse(await request.json());

    const ipAddress =
      request.headers.get('x-nf-client-connection-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
    await enforceIpRateLimit(ipAddress);
    await checkRateLimit(sessionId);

    // BILLING-001 Phase 2: meter creative AI generation.
    const billingCtx = await resolveBillingContext(request);
    try {
      await assertEntitled(billingCtx, { feature: 'game.generate' });
    } catch (billingErr) {
      throw toAppException(billingErr);
    }

    const result = await createGame({ sessionId, ...input });

    return apiSuccess({
      game: result.game,
      aiXray: result.aiXray,
      creationId: result.creationId,
      shareUrl: result.shareUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
