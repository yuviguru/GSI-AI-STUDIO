/**
 * Persist generated images to object storage.
 *
 * The image-gen adapters often return base64 data URIs (Pixazo when no
 * external URL is exposed; ComfyUI local; some Pollinations responses).
 * Storing those inline in Firestore docs is the highest-leverage cost
 * issue called out in `docs/infra-cost-and-migration-plan.md`:
 *   - 4-panel comic = ~800KB Firestore doc, near the 1MB limit
 *   - Public-feed reads of 20 comics = 16MB egress per scroll
 *   - At 30K MAU: ~480GB/month egress = ~$58/month JUST for that feed
 *
 * This helper takes any image URL (data: URI or external https://...)
 * and ensures the persisted version is a stable storage URL that:
 *   1. Doesn't bloat Firestore docs
 *   2. Doesn't expire (Replicate URLs expire in ~24h)
 *   3. Is publicly cacheable for the share-link flow
 *
 * Falls through to the original URL on storage failure — image generation
 * is the expensive part; we never want a storage hiccup to lose a creation.
 */

import { backend } from '@/lib/backend';
import { adminStorage } from '@/lib/firebase/admin';
import { nanoid } from 'nanoid';

const BUCKET_PREFIX = 'creations';

/**
 * Persist an image (URL or data URI) to object storage.
 * Returns the public storage URL (or the original URL if persistence
 * fails — best-effort).
 *
 * @param sourceUrl  data: URI or external https:// URL
 * @param namespace  e.g. `story` / `comic` — folder grouping in storage
 * @param sessionId  for path scoping; truncated/hashed shouldn't matter
 *                   because the path itself is treated as opaque
 */
export async function persistImage(
  sourceUrl: string,
  namespace: string,
  sessionId: string,
): Promise<string> {
  // External URLs that aren't expiring (Pixazo, our own URLs, Pollinations)
  // can pass through. Data URIs MUST be uploaded.
  // Replicate URLs expire — we re-host them so the share-link still works.
  if (!shouldPersist(sourceUrl)) return sourceUrl;

  try {
    const { buffer, contentType, ext } = await fetchImageBytes(sourceUrl);
    const id = nanoid(16);
    const safeNs = namespace.replace(/[^a-z0-9_-]/gi, '_');
    const safeSession = sessionId.replace(/[^a-z0-9_-]/gi, '_').slice(0, 32);
    const path = `${BUCKET_PREFIX}/${safeNs}/${safeSession}/${id}.${ext}`;

    // Direct upload via the bucket (the StorageProvider port doesn't
    // currently expose an "upload buffer" method; signed-URL flow assumes
    // a client-side PUT). Server-side direct upload is appropriate here.
    const file = adminStorage.bucket().file(path);
    await file.save(buffer, {
      contentType,
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    });
    await file.makePublic().catch(() => {
      // Some buckets disable public access globally — caller can still
      // generate signed URLs from the path. Don't fail the persist.
    });
    return await backend.storage.getDownloadUrl(path);
  } catch (err) {
    console.warn(
      `[capabilities/persistImage] storage persistence failed for ${namespace}, falling back to in-memory URL:`,
      err instanceof Error ? err.message : err,
    );
    return sourceUrl;
  }
}

/** Persist many images in parallel; preserves input order. */
export async function persistImages(
  sources: string[],
  namespace: string,
  sessionId: string,
): Promise<string[]> {
  return Promise.all(sources.map((url) => persistImage(url, namespace, sessionId)));
}

function shouldPersist(url: string): boolean {
  if (url.startsWith('data:')) return true;
  // Replicate's image URLs are signed and expire — re-host them.
  if (url.includes('replicate.delivery')) return true;
  // Pollinations URLs are permanent; Pixazo returns either external or data: URIs.
  return false;
}

interface FetchedImage {
  buffer: Buffer;
  contentType: string;
  ext: string;
}

async function fetchImageBytes(url: string): Promise<FetchedImage> {
  if (url.startsWith('data:')) {
    const commaIdx = url.indexOf(',');
    if (commaIdx === -1) throw new Error('Invalid data URI');
    const meta = url.slice(5, commaIdx); // strip "data:"
    const payload = url.slice(commaIdx + 1);
    const contentType = meta.split(';')[0] ?? 'image/png';
    const buffer = meta.includes(';base64')
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf-8');
    return { buffer, contentType, ext: extFromMime(contentType) };
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Image fetch ${res.status} for ${url.slice(0, 80)}`);
  const contentType = res.headers.get('content-type') ?? 'image/png';
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType, ext: extFromMime(contentType) };
}

function extFromMime(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'png';
}
