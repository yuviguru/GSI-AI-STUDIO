import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';

/**
 * POST /api/share/[id]
 * Generate shareable link + OG image for a creation.
 * See: docs/api-contracts.md#post-apishareid
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) throw new AppException('INVALID_INPUT', 'Creation ID required', 400);

    // TODO: Implement in SHARE-001
    // - Fetch creation from Firestore
    // - Generate OG image (if not already cached)
    // - Build WhatsApp-optimized share URL
    // - Increment share count

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    return apiSuccess({
      shareUrl: `${baseUrl}/view/${id}`,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`Check out what I made with AI! ${baseUrl}/view/${id}`)}`,
      ogImage: `${baseUrl}/api/og/${id}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
