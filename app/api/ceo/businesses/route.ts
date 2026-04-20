import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { listBusinessesForKid } from '@/lib/firebase/ceoService';

/**
 * GET /api/ceo/businesses
 *
 * List every Kid CEO business for the active kid profile — active + completed,
 * newest first. Used by the `/ceo` landing page. Single-business reads go
 * through `GET /api/ceo/business?businessId=...` instead.
 */
export async function GET(request: NextRequest) {
  try {
    const { kidId } = await requireAuthWithKid(request);
    const businesses = await listBusinessesForKid(kidId, 20);
    return apiSuccess({ businesses });
  } catch (error) {
    return handleApiError(error);
  }
}
