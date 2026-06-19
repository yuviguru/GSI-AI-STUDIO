import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { updateKid } from '@gsi/firebase/kidService';
import { uploadAvatarToStorage } from '@/lib/images/avatarStorage';

/**
 * POST /api/users/kids/[kidId]/author-photo — Upload the kid's REAL author
 * photo (BOOK-011) for the back cover of their published books.
 *
 * Body: { imageBase64: string, contentType: 'image/jpeg' | 'image/png' | 'image/webp' }
 * (raw base64, no data: prefix — the client strips it before sending).
 *
 * Flow: parent-token auth → size/type caps → upload to Firebase Storage under
 * avatars/author/ → persist the URL on the kid doc (authorPhotoUrl) so it
 * defaults across all the kid's books → return the URL so the caller can also
 * stamp it on the current book's backCover.
 *
 * Ownership gate: updateKid verifies parentId before the URL is returned. A
 * forged kidId 403s; the just-uploaded object is then unreferenced and its
 * random filename is never disclosed to the caller.
 */

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
/** ~3MB of raw image — plenty for a profile photo, small enough for a JSON body. */
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: { kidId: string } }) {
  try {
    const auth = await verifyAuth(request);
    const { kidId } = params;
    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'Kid ID is required', 400);
    }

    const body = await request.json();
    const imageBase64 = body?.imageBase64;
    const rawContentType = body?.contentType;

    if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
      throw new AppException('INVALID_INPUT', 'imageBase64 is required', 400);
    }
    if (typeof rawContentType !== 'string' || !ALLOWED_CONTENT_TYPES.has(rawContentType)) {
      throw new AppException('INVALID_INPUT', 'Photo must be a JPEG, PNG, or WebP image', 400);
    }
    const contentType = rawContentType === 'image/jpg' ? 'image/jpeg' : rawContentType;

    // Base64 inflates ~4/3 — bound the encoded length before decoding so a
    // huge body can't balloon server memory.
    if (imageBase64.length > (MAX_PHOTO_BYTES * 4) / 3 + 16) {
      throw new AppException('INVALID_INPUT', 'Photo is too large — keep it under 3MB', 400);
    }
    let buffer: Buffer;
    try {
      buffer = Buffer.from(imageBase64, 'base64');
    } catch {
      throw new AppException('INVALID_INPUT', 'Invalid image data', 400);
    }
    if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) {
      throw new AppException('INVALID_INPUT', 'Photo is too large — keep it under 3MB', 400);
    }

    const url = await uploadAvatarToStorage(buffer, contentType, 'avatars/author');
    if (!url) {
      throw new AppException(
        'STORAGE_UNAVAILABLE',
        'Photo upload is not available right now — try again later',
        503,
      );
    }

    // Persist on the kid doc — this is also the ownership gate (parentId
    // check inside updateKid). A forged kidId 403s here and the caller never
    // learns the uploaded URL.
    await updateKid(auth.userId, kidId, { authorPhotoUrl: url });

    return apiSuccess({ url });
  } catch (error) {
    return handleApiError(error);
  }
}
