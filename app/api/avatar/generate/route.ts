import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { filterImagePrompt } from '@/lib/safety/inputFilter';
import { getImageProvider } from '@/lib/ai/imageProvider';
import { adminDb } from '@/lib/firebase/admin';
import {
  decodeDataUri,
  encodeDataUri,
  stripJpegMetadata,
} from '@/lib/images/jpegSanitize';
import { uploadAvatarToStorage } from '@/lib/images/avatarStorage';

/** Allowed trait values — restricts the prompt surface so kids can't inject
 *  unsafe descriptors via the trait picker. Free-text is filtered separately. */
const ALLOWED_HAIR = [
  'short black',
  'long black',
  'short brown',
  'long brown',
  'curly',
  'spiky',
  'braided',
  'bun',
  'colorful',
] as const;

const ALLOWED_VIBE = [
  'cheerful',
  'cool',
  'thoughtful',
  'energetic',
  'mysterious',
  'sporty',
  'creative',
  'adventurous',
] as const;

const ALLOWED_OUTFIT = [
  't-shirt and jeans',
  'school uniform',
  'hoodie',
  'sporty jacket',
  'space suit',
  'wizard robes',
  'kurta',
  'lab coat',
] as const;

const ALLOWED_ACCESSORY = [
  'none',
  'glasses',
  'cap',
  'headphones',
  'beanie',
  'crown',
] as const;

interface AvatarTraits {
  hair?: string;
  vibe?: string;
  outfit?: string;
  accessory?: string;
  description?: string;
}

const MAX_DESCRIPTION = 120;

// Avatar generation is expensive (paid AI providers). These caps protect quota.
const AVATAR_RATE_LIMIT_COLLECTION = 'avatarRateLimits';
const MAX_AVATARS_PER_IP_PER_HOUR = 10;
const MAX_AVATARS_PER_SESSION_PER_HOUR = 8;

function pickAllowed<T extends readonly string[]>(
  list: T,
  value: unknown,
  fallback: T[number],
): T[number] {
  if (typeof value !== 'string') return fallback;
  return (list as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

function buildAvatarPrompt(traits: AvatarTraits): string {
  const hair = pickAllowed(ALLOWED_HAIR, traits.hair, 'short black');
  const vibe = pickAllowed(ALLOWED_VIBE, traits.vibe, 'cheerful');
  const outfit = pickAllowed(ALLOWED_OUTFIT, traits.outfit, 't-shirt and jeans');
  const accessory = pickAllowed(ALLOWED_ACCESSORY, traits.accessory, 'none');

  const description = (traits.description ?? '').slice(0, MAX_DESCRIPTION).trim();

  const parts: string[] = [
    'cute cartoon avatar portrait of an Indian kid',
    `${hair} hair`,
    `${vibe} expression`,
    `wearing ${outfit}`,
  ];
  if (accessory !== 'none') parts.push(`with ${accessory}`);
  if (description) parts.push(description);

  parts.push(
    'centered head and shoulders portrait',
    'soft pastel background',
    'rounded shapes',
    'flat illustration',
    'children book style',
    'safe for kids',
  );

  return parts.join(', ');
}

function hourKeyUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCHours()).padStart(2, '0')}`;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hourly hashed counter, scoped per (key, hour).
 * Returns the new count. Throws RATE_LIMITED if over the cap.
 */
async function bumpHourlyCounter(
  key: string,
  cap: number,
  scope: string,
): Promise<void> {
  if (!key) return; // local dev with no IP/session — skip

  // Skip rate limiting if Firestore isn't available (dev without creds).
  // The `getServiceAccount` call inside adminDb proxy would throw — catch
  // and bypass cleanly so dev preview works.
  let docRef;
  try {
    const id = `${scope}_${await sha256Hex(key)}_${hourKeyUtc()}`;
    docRef = adminDb.collection(AVATAR_RATE_LIMIT_COLLECTION).doc(id);
  } catch {
    return;
  }

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(docRef!);
      const count = snap.exists ? ((snap.data()?.count as number) ?? 0) : 0;
      if (count >= cap) {
        throw new AppException(
          'RATE_LIMITED',
          'Hold up — that\'s a lot of avatar tries. Take a break and come back in a bit!',
          429,
        );
      }
      // Expire after 2h so the doc self-cleans (TTL via expiresAt).
      const expiresAt = new Date();
      expiresAt.setUTCHours(expiresAt.getUTCHours() + 2);
      tx.set(
        docRef!,
        {
          count: count + 1,
          updatedAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(expiresAt),
        },
        { merge: true },
      );
    });
  } catch (err) {
    // Re-throw rate-limit errors. Swallow infra errors (no creds, etc.) so dev
    // works without Firebase configured.
    if (err instanceof AppException) throw err;
    return;
  }
}

/**
 * POST /api/avatar/generate
 *
 * Generates a kid-friendly cartoon avatar from picked traits + optional
 * description. Used during onboarding profile setup.
 *
 * Rate-limited per IP (10/hour) and per session (8/hour) to protect AI quota.
 * Strips EXIF/metadata from the result. Uploads to Firebase Storage when
 * configured (returns a clean URL); otherwise returns a sanitised data URI.
 *
 * Body:   AvatarTraits
 * Header: X-Session-Id  (recommended — bound for rate limiting)
 *
 * Returns: { imageUrl, prompt, providerName, persisted: boolean }
 *   - persisted=true → imageUrl is a Storage URL safe to save on the kid doc
 *   - persisted=false → imageUrl is a data URI for transient display only
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limits before any expensive work
    const ipAddress =
      request.headers.get('x-nf-client-connection-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
    const sessionId = request.headers.get('X-Session-Id');

    if (ipAddress) {
      await bumpHourlyCounter(ipAddress, MAX_AVATARS_PER_IP_PER_HOUR, 'ip');
    }
    if (sessionId) {
      await bumpHourlyCounter(sessionId, MAX_AVATARS_PER_SESSION_PER_HOUR, 'session');
    }

    const body = (await request.json()) as AvatarTraits;
    const prompt = buildAvatarPrompt(body);

    // Safety filter — throws AppException on unsafe content
    filterImagePrompt(prompt);

    const { imageFunction, providerName } = getImageProvider();

    const rawImageUrl = await imageFunction({
      prompt,
      style: 'cartoon',
      width: 512,
      height: 512,
    });

    // If the provider returned a data URI, sanitise it (strip EXIF/prompt
    // metadata) and try to upload to Storage so we can persist a clean URL.
    const decoded = decodeDataUri(rawImageUrl);
    let imageUrl = rawImageUrl;
    let persisted = false;

    if (decoded) {
      const sanitised =
        decoded.contentType === 'image/jpeg' || decoded.contentType === 'image/jpg'
          ? stripJpegMetadata(decoded.buffer)
          : decoded.buffer;

      const storageUrl = await uploadAvatarToStorage(
        sanitised,
        decoded.contentType,
        'avatars/preview',
      );

      if (storageUrl) {
        imageUrl = storageUrl;
        persisted = true;
      } else {
        // Fall back to sanitised data URI (still smaller than the original).
        imageUrl = encodeDataUri(decoded.contentType, sanitised);
      }
    } else if (
      rawImageUrl.startsWith('https://') &&
      rawImageUrl.length < 2048
    ) {
      // Provider returned a URL directly — pass through, mark as persisted
      // since the URL is stable.
      persisted = true;
    }

    return apiSuccess({ imageUrl, prompt, providerName, persisted });
  } catch (error) {
    return handleApiError(error);
  }
}
