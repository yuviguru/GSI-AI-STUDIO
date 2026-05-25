/**
 * POST /api/ai/music — thin HTTP wrapper around the createMusic capability.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { musicInputSchema } from '@/lib/validators';
import { checkRateLimit, enforceIpRateLimit } from '@gsi/firebase/sessionService';
import { createMusic } from '@/lib/capabilities/createMusic';
import { assertEntitled, resolveBillingContext, toAppException } from '@/lib/billing';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const input = musicInputSchema.parse(await request.json());

    const ipAddress =
      request.headers.get('x-nf-client-connection-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
    await enforceIpRateLimit(ipAddress);
    await checkRateLimit(sessionId);

    // BILLING-001 Phase 2: meter creative AI generation. See story route for
    // the rationale — anonymous callers bypass the credit debit; authed
    // callers pay from their kid's wallet.
    const billingCtx = await resolveBillingContext(request);
    try {
      await assertEntitled(billingCtx, { feature: 'music.compose' });
    } catch (billingErr) {
      throw toAppException(billingErr);
    }

    const result = await createMusic({ sessionId, ...input });

    return apiSuccess({
      music: result.music,
      aiXray: result.aiXray,
      creationId: result.creationId,
      shareUrl: result.shareUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
