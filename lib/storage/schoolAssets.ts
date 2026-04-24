/**
 * Phase 4 (ADMIN-009): school-branding asset uploads.
 *
 * Stores logo + letterhead images under a deterministic path in Firebase
 * Storage and writes the resulting public URL onto the school doc. Accepts
 * PNG/JPG only, up to 2MB. Does not transform the image — clients crop /
 * resize before upload.
 */

import { adminStorage } from '@/lib/firebase/admin';
import { setSchoolBrandingAssetUrl } from '@/lib/firebase/schoolService';
import { AppException } from '@/lib/api-utils';

export type SchoolAssetKind = 'logo' | 'letterhead';

const ACCEPTED_MIME = new Set(['image/png', 'image/jpeg']);
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

function extensionFor(contentType: string): 'png' | 'jpg' {
  return contentType === 'image/png' ? 'png' : 'jpg';
}

function storagePath(schoolId: string, kind: SchoolAssetKind, ext: string) {
  return `schools/${schoolId}/branding/${kind}.${ext}`;
}

/**
 * Uploads a branding asset and writes its URL onto the school doc. Admin-only
 * enforcement lives at the API route; this function trusts its caller.
 */
export async function uploadSchoolAsset(
  schoolId: string,
  kind: SchoolAssetKind,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (!ACCEPTED_MIME.has(contentType)) {
    throw new AppException(
      'INVALID_INPUT',
      'Only PNG or JPG images are allowed.',
      400,
    );
  }
  if (buffer.byteLength === 0) {
    throw new AppException('INVALID_INPUT', 'Uploaded file is empty.', 400);
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new AppException(
      'INVALID_INPUT',
      `File is too large (max ${MAX_BYTES / (1024 * 1024)}MB).`,
      400,
    );
  }

  const ext = extensionFor(contentType);
  const path = storagePath(schoolId, kind, ext);

  const bucket = adminStorage.bucket();
  const file = bucket.file(path);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: {
      cacheControl: 'public, max-age=3600',
      metadata: { schoolId, kind },
    },
  });
  await file.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/${path}`;
  await setSchoolBrandingAssetUrl(schoolId, kind, url);
  return url;
}

export async function deleteSchoolAsset(
  schoolId: string,
  kind: SchoolAssetKind,
): Promise<void> {
  const bucket = adminStorage.bucket();
  for (const ext of ['png', 'jpg']) {
    const file = bucket.file(storagePath(schoolId, kind, ext));
    const [exists] = await file.exists();
    if (exists) await file.delete().catch(() => undefined);
  }
  await setSchoolBrandingAssetUrl(schoolId, kind, null);
}
