import { adminStorage } from '@gsi/firebase/admin';

/**
 * Allowed Storage path prefixes. Constraining the type prevents a future
 * caller from passing attacker-controlled / traversal-laden strings (e.g.
 * `'avatars/../../admin'`) that would land outside the intended GCS prefix.
 * Add new buckets here, not at the call site.
 */
export type AvatarPathPrefix = 'avatars/preview' | 'avatars/generated';

/** Max bytes we'll accept when mirroring a provider URL to our Storage.
 *  Generated avatars are typically 50–200KB; this cap defends against a
 *  rogue/misconfigured provider returning a huge file. */
const MAX_MIRROR_BYTES = 4 * 1024 * 1024;
/** Timeout for the provider download — providers shouldn't take this long
 *  to serve a 512×512 image; if they do, fall back so the user isn't stuck. */
const MIRROR_FETCH_TIMEOUT_MS = 8000;
/** Content types we're willing to mirror. */
const MIRRORABLE_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

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
  pathPrefix: AvatarPathPrefix,
): Promise<string | null> {
  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    // Loud, single-source log so an unconfigured deploy is obvious. Without
    // this the generated avatar comes back persisted=false and the kid doc
    // never receives it — the carousel can't tell why, and the missing-fields
    // gate keeps re-firing on every refresh. Surfacing the cause here makes
    // the root issue (env var) visible.
    console.warn(
      '[avatarStorage] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set — ' +
        'avatars will return as data URIs (persisted=false) and the kid ' +
        'doc will not receive an avatarUrl. Set the bucket env var to ' +
        'enable Storage upload.',
    );
    return null;
  }
  if (bucketName === 'demo.appspot.com') {
    console.warn(
      '[avatarStorage] Storage bucket is the demo placeholder ' +
        '(demo.appspot.com) — uploads disabled. Configure a real bucket ' +
        'to persist avatars.',
    );
    return null;
  }

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
    console.error(
      '[avatarStorage] upload failed — falling back to data URI:',
      {
        bucketName,
        pathPrefix,
        contentType,
        bufferBytes: buffer.length,
        error: err instanceof Error ? `${err.name}: ${err.message}` : err,
      },
    );
    return null;
  }
}

/**
 * Download an image from a third-party URL (Pixazo, Pollinations, etc.) and
 * re-host it on our Firebase Storage. Returns OUR storage URL, or null on
 * any failure (caller should fall back to the original source URL).
 *
 * Why this exists:
 *   AI image providers like pixazo-flux-schnell return CDN URLs to their
 *   own buckets (Cloudflare R2, etc.). If we save those URLs verbatim onto
 *   kid docs, we're permanently dependent on the provider's CDN:
 *     - they can purge old objects without notice
 *     - they can change/retire their domain
 *     - they can rate-limit us
 *     - if they go out of business, every kid's avatar dies
 *     - we can't honor a user's right-to-erasure request (GDPR / DPDP)
 *   Mirroring once at generation time means the URL on the kid doc is
 *   forever ours — the provider's URL is just a transient fetch source.
 *
 * Stock-photo URLs (Pexels, Unsplash) are NOT mirrored elsewhere — those
 * are reusable references to third-party content with their own licensing
 * model. This helper is for AI-generated content where we logically own
 * the output and just need a place to host it.
 *
 * Failure modes (all → null):
 *   - bucket env unset (uploadAvatarToStorage handles this)
 *   - fetch timeout, network error, non-200 response
 *   - content-type not in MIRRORABLE_CONTENT_TYPES
 *   - response body exceeds MAX_MIRROR_BYTES
 *   - Storage upload itself fails
 */
export async function mirrorAvatarToStorage(
  sourceUrl: string,
  pathPrefix: AvatarPathPrefix,
): Promise<string | null> {
  // Validate scheme — we only mirror https URLs (no data:, no http://, no
  // file://). The route layer's allowlist is the trust boundary; this is
  // defense-in-depth.
  if (!sourceUrl.startsWith('https://')) {
    console.warn(
      '[avatarStorage.mirror] refusing non-https source:',
      sourceUrl.slice(0, 80),
    );
    return null;
  }

  // Download with timeout + size guard.
  let buffer: Buffer;
  let contentType: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MIRROR_FETCH_TIMEOUT_MS);
    // Promise.finally clears the timer whether fetch resolves or rejects,
    // without confusing TS's definite-assignment narrowing on `res`.
    // `redirect: 'error'` is an SSRF guard: the https-only check above
    // applies to the *original* sourceUrl, but a 3xx redirect from an
    // allowlisted HTTPS host could send the resolved request to an internal
    // target (169.254.169.254 metadata, RFC1918 hosts, localhost). Failing
    // closed on any 3xx forces the provider to serve the image directly.
    const res = await fetch(sourceUrl, {
      method: 'GET',
      headers: { Accept: 'image/*' },
      signal: controller.signal,
      redirect: 'error',
    }).finally(() => clearTimeout(timer));
    if (!res.ok) {
      console.warn(
        `[avatarStorage.mirror] source returned ${res.status} ${res.statusText}:`,
        sourceUrl.slice(0, 80),
      );
      return null;
    }
    // noUncheckedIndexedAccess types `split(';')[0]` as `string | undefined`,
    // so use optional chaining + fallback to keep the type as plain string.
    const ct =
      (res.headers.get('content-type') ?? '')
        .split(';')[0]
        ?.trim()
        .toLowerCase() ?? '';
    if (!MIRRORABLE_CONTENT_TYPES.has(ct)) {
      console.warn(
        '[avatarStorage.mirror] unexpected content-type, refusing to mirror:',
        { sourceUrl: sourceUrl.slice(0, 80), contentType: ct },
      );
      return null;
    }
    contentType = ct === 'image/jpg' ? 'image/jpeg' : ct;

    // Size guard — read into ArrayBuffer and check.
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_MIRROR_BYTES) {
      console.warn(
        '[avatarStorage.mirror] source exceeds size cap, refusing to mirror:',
        {
          sourceUrl: sourceUrl.slice(0, 80),
          bytes: ab.byteLength,
          cap: MAX_MIRROR_BYTES,
        },
      );
      return null;
    }
    buffer = Buffer.from(ab);
  } catch (err) {
    console.warn(
      '[avatarStorage.mirror] download failed:',
      {
        sourceUrl: sourceUrl.slice(0, 80),
        error: err instanceof Error ? `${err.name}: ${err.message}` : err,
      },
    );
    return null;
  }

  // Hand off to the existing Storage upload pipeline.
  return uploadAvatarToStorage(buffer, contentType, pathPrefix);
}
