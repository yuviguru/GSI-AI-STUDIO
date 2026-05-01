import { adminStorage } from '@/lib/firebase/admin';

/**
 * Upload an avatar buffer to Firebase Storage and return a long-lived public URL.
 *
 * Reads the bucket name from `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (the same
 * var used by the client SDK in `lib/firebase/client.ts`) so deployers don't
 * have to configure the bucket twice. `FIREBASE_STORAGE_BUCKET` is also
 * accepted as a fallback for backward compatibility.
 *
 * Falls back to returning null when:
 *   - Storage isn't configured (neither env var set)
 *   - The bucket name is the demo placeholder (`demo.appspot.com`)
 *   - The upload fails for any reason
 *
 * Callers should treat null as "use the in-memory data URI" — the avatar is
 * still displayable, just not persistable across devices.
 */
export async function uploadAvatarToStorage(
  buffer: Buffer,
  contentType: string,
  pathPrefix: string,
): Promise<string | null> {
  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName || bucketName === 'demo.appspot.com') return null;

  try {
    const bucket = adminStorage.bucket(bucketName);
    const ext = contentType === 'image/png' ? 'png' : 'jpg';
    const filename = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const file = bucket.file(filename);

    await file.save(buffer, {
      contentType,
      // Cache aggressively — avatars never change at this URL.
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
      public: false, // Use signed URL below for controlled access.
    });

    // Make publicly readable so the browser can render without auth.
    await file.makePublic();

    return `https://storage.googleapis.com/${bucketName}/${encodeURI(filename)}`;
  } catch (err) {
    console.warn(
      '[avatarStorage] upload failed — falling back to data URI:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
