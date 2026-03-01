import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { getCreation, incrementShare } from '@/lib/firebase/creationService';

const SHARE_MESSAGES: Record<string, (title: string, url: string) => string> = {
  story: (title, url) => `Check out the AI story I made: "${title}"! Read it here: ${url}`,
  music: (title, url) => `Listen to the AI song I created: "${title}"! ${url}`,
  quiz: (title, url) => `Can you beat my AI quiz: "${title}"? Try it: ${url}`,
  game: (title, url) => `Play the AI game I made: "${title}"! ${url}`,
  comic: (title, url) => `Check out the AI comic I created: "${title}"! ${url}`,
};

/**
 * POST /api/share/[id]
 * Generate shareable link + WhatsApp deep link for a creation.
 * See: docs/api-contracts.md#post-apishareid
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) throw new AppException('INVALID_INPUT', 'Creation ID required', 400);

    const creation = await getCreation(id);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const shareUrl = `${baseUrl}/view/${id}`;
    const ogImage = `${baseUrl}/api/og/${id}`;

    const buildMessage = SHARE_MESSAGES[creation.type];
    const message = buildMessage
      ? buildMessage(creation.title, shareUrl)
      : `Check out what I made with AI! ${shareUrl}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    // Fire-and-forget share count increment
    incrementShare(id).catch(() => {});

    return apiSuccess({ shareUrl, whatsappUrl, ogImage });
  } catch (error) {
    return handleApiError(error);
  }
}
