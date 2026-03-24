import { NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth-utils';
import { claimSession } from '@/lib/firebase/userService';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';

const claimSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required').max(128),
});

/**
 * POST /api/auth/claim-session
 * Migrate anonymous session data (creations, points, badges) to authenticated account.
 * Idempotent — safe to call multiple times.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyAuth(request);

    const body = await request.json();
    const input = claimSchema.safeParse(body);
    if (!input.success) {
      throw new AppException('INVALID_INPUT', input.error.errors[0]?.message ?? 'Invalid input', 400);
    }

    const result = await claimSession(decoded.uid, input.data.sessionId);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
