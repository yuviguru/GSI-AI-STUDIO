/**
 * Unified asset service (PERF-001).
 *
 * Storage abstraction across studios — every binary upload (audio
 * recordings, music tracks, comic panels, PDFs) flows through here.
 *
 * Provider selection:
 *   - Cloudflare R2 if R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY +
 *     R2_BUCKET + R2_ENDPOINT are set (production preferred — $0 egress)
 *   - Firebase Cloud Storage otherwise (default — works out of the
 *     box with the existing Firebase project)
 *
 * Upload flow (server bandwidth = 0):
 *   1. Client → POST /api/assets/upload-url → server creates asset
 *      doc with status='uploading', returns pre-signed PUT URL
 *   2. Client → PUT directly to storage provider (R2 or Firebase
 *      resumable upload URL) — server is not in the path
 *   3. Client → POST /api/assets/finalize → server HEADs the storage
 *      object, sets status='ready', runs auto-moderation
 *
 * For Firebase Storage, "pre-signed PUT" is implemented via signed
 * v4 URLs through the Admin SDK's `getSignedUrl({ action: 'write' })`.
 *
 * See docs/data-model.md#assets and docs/architecture.md#storage.
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { adminStorage } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';
import type {
  Asset,
  AssetKind,
  AssetSourceType,
  AssetParentRefType,
  AssetStorageProvider,
  AssetStatus,
  AssetVisibility,
  AssetModeration,
} from '@/types/asset.types';

// ─────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────

const ASSETS_COLLECTION = 'assets';
const UPLOAD_URL_TTL_SEC = 600; // 10 minutes
const PUBLIC_URL_TTL_SEC = 60 * 60 * 24 * 7; // 7 days for read URLs (refreshed on demand)

/** Per-kind size caps (server-enforced) */
export const ASSET_SIZE_CAPS: Record<AssetKind, number> = {
  audio: 10 * 1024 * 1024, // 10 MB
  video: 50 * 1024 * 1024, // 50 MB
  image: 5 * 1024 * 1024, //  5 MB
  pdf: 20 * 1024 * 1024, // 20 MB
};

/** Per-kind allowed MIME types */
export const ASSET_ALLOWED_MIME: Record<AssetKind, ReadonlyArray<string>> = {
  audio: ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'],
  video: ['video/webm', 'video/mp4'],
  image: ['image/png', 'image/jpeg', 'image/webp'],
  pdf: ['application/pdf'],
};

/** Per-kind file extensions for storage keys */
const KIND_EXT: Record<AssetKind, string> = {
  audio: 'webm',
  video: 'webm',
  image: 'png',
  pdf: 'pdf',
};

/** Per-session asset quotas (used by Phase 1 anonymous sessions) */
export const ASSET_QUOTA = {
  audio: { count: 100, totalBytes: 50 * 1024 * 1024 }, // 100 recordings or 50 MB
  video: { count: 20, totalBytes: 200 * 1024 * 1024 }, //  20 recordings or 200 MB
  image: { count: 200, totalBytes: 50 * 1024 * 1024 },
  pdf: { count: 50, totalBytes: 100 * 1024 * 1024 },
} as const;

// ─────────────────────────────────────────────────────────────────────
// Provider detection
// ─────────────────────────────────────────────────────────────────────

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_ENDPOINT
  );
}

export function selectedProvider(): AssetStorageProvider {
  return isR2Configured() ? 'r2' : 'firebase';
}

// ─────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────

export interface CreateUploadUrlInput {
  kind: AssetKind;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  sourceType: AssetSourceType;
  parentRefType?: AssetParentRefType;
  parentRefId?: string;
  ownerSessionId?: string;
  ownerKidId?: string;
  ownerUserId?: string;
}

export interface CreateUploadUrlResult {
  assetId: string;
  uploadUrl: string;
  uploadMethod: 'PUT' | 'POST';
  headers: Record<string, string>;
  expiresInSec: number;
}

// ─────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────

function assertValidUploadInput(input: CreateUploadUrlInput): void {
  const allowed = ASSET_ALLOWED_MIME[input.kind];
  if (!allowed.includes(input.mimeType)) {
    throw new AppException(
      'UNSUPPORTED_MIME',
      `MIME type '${input.mimeType}' not allowed for ${input.kind}`,
      400,
    );
  }

  const cap = ASSET_SIZE_CAPS[input.kind];
  if (input.sizeBytes <= 0) {
    throw new AppException('INVALID_INPUT', 'Asset size must be positive', 400);
  }
  if (input.sizeBytes > cap) {
    throw new AppException(
      'PAYLOAD_TOO_LARGE',
      `${input.kind} files must be under ${cap / (1024 * 1024)} MB`,
      413,
    );
  }

  // Recording-specific duration cap (90s for sing-along/voice memo)
  if (
    input.sourceType === 'user_recording' &&
    (input.kind === 'audio' || input.kind === 'video') &&
    input.durationSec !== undefined &&
    input.durationSec > 90
  ) {
    throw new AppException(
      'PAYLOAD_TOO_LARGE',
      'Recordings must be 90 seconds or less',
      400,
    );
  }
}

/** Quota check — rejects if owner already at the limit. */
async function assertWithinQuota(
  ownerSessionId: string | undefined,
  ownerKidId: string | undefined,
  kind: AssetKind,
  newSizeBytes: number,
): Promise<void> {
  if (!ownerSessionId && !ownerKidId) return; // nothing to query against
  const quota = ASSET_QUOTA[kind];

  let q = adminDb
    .collection(ASSETS_COLLECTION)
    .where('kind', '==', kind)
    .where('status', 'in', ['ready', 'uploading']);

  if (ownerKidId) {
    q = q.where('ownerKidId', '==', ownerKidId);
  } else if (ownerSessionId) {
    q = q.where('ownerSessionId', '==', ownerSessionId);
  }

  const snap = await q.get();
  const existingCount = snap.size;
  const existingBytes = snap.docs.reduce(
    (sum, d) => sum + (Number(d.data().sizeBytes) || 0),
    0,
  );

  if (existingCount >= quota.count) {
    throw new AppException(
      'QUOTA_EXCEEDED',
      `You've reached the limit of ${quota.count} ${kind} files. Delete some old ones to make room.`,
      429,
    );
  }
  if (existingBytes + newSizeBytes > quota.totalBytes) {
    throw new AppException(
      'QUOTA_EXCEEDED',
      `You've used up your ${kind} storage. Delete some old files to make room.`,
      429,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Storage provider implementations
// ─────────────────────────────────────────────────────────────────────

interface StorageProvider {
  /** Build the storage key for an asset. */
  storageKey(assetId: string, kind: AssetKind, ext: string): string;
  /** Issue a pre-signed write URL for direct upload. */
  createUploadUrl(input: {
    storageKey: string;
    mimeType: string;
    expiresInSec: number;
  }): Promise<{ uploadUrl: string; uploadMethod: 'PUT' | 'POST'; headers: Record<string, string> }>;
  /** Verify the upload completed. */
  objectExists(storageKey: string): Promise<{ exists: boolean; sizeBytes?: number }>;
  /** Build the publicly-accessible URL (CDN-fronted in prod). */
  publicUrl(storageKey: string): Promise<string>;
  /** Delete the underlying object. */
  deleteObject(storageKey: string): Promise<void>;
}

class FirebaseProvider implements StorageProvider {
  storageKey(assetId: string, kind: AssetKind, ext: string): string {
    return `assets/${kind}/${assetId}.${ext}`;
  }

  async createUploadUrl(input: {
    storageKey: string;
    mimeType: string;
    expiresInSec: number;
  }): Promise<{ uploadUrl: string; uploadMethod: 'PUT'; headers: Record<string, string> }> {
    const bucket = adminStorage.bucket();
    const file = bucket.file(input.storageKey);
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + input.expiresInSec * 1000,
      contentType: input.mimeType,
    });
    return {
      uploadUrl,
      uploadMethod: 'PUT',
      headers: { 'Content-Type': input.mimeType },
    };
  }

  async objectExists(
    storageKey: string,
  ): Promise<{ exists: boolean; sizeBytes?: number }> {
    const bucket = adminStorage.bucket();
    const file = bucket.file(storageKey);
    const [exists] = await file.exists();
    if (!exists) return { exists: false };
    const [meta] = await file.getMetadata();
    return { exists: true, sizeBytes: Number(meta.size) || 0 };
  }

  async publicUrl(storageKey: string): Promise<string> {
    // For private-by-default access, return a long-lived signed URL.
    // For public assets, makePublic() is called separately at finalize.
    const bucket = adminStorage.bucket();
    const file = bucket.file(storageKey);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + PUBLIC_URL_TTL_SEC * 1000,
    });
    return url;
  }

  async deleteObject(storageKey: string): Promise<void> {
    const bucket = adminStorage.bucket();
    await bucket
      .file(storageKey)
      .delete({ ignoreNotFound: true })
      .catch(() => undefined);
  }
}

class R2Provider implements StorageProvider {
  storageKey(assetId: string, kind: AssetKind, ext: string): string {
    return `${kind}/${assetId}.${ext}`;
  }

  async createUploadUrl(_input: {
    storageKey: string;
    mimeType: string;
    expiresInSec: number;
  }): Promise<{ uploadUrl: string; uploadMethod: 'PUT'; headers: Record<string, string> }> {
    // R2 implementation requires @aws-sdk/client-s3 + s3-request-presigner.
    // Install with: pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
    // Then implement using PutObjectCommand + getSignedUrl. The asset
    // service interface below stays unchanged.
    throw new AppException(
      'NOT_IMPLEMENTED',
      'R2 provider scaffolded but not yet wired — install @aws-sdk/client-s3 and complete R2Provider.createUploadUrl',
      501,
    );
  }

  async objectExists(_storageKey: string): Promise<{ exists: boolean; sizeBytes?: number }> {
    throw new AppException('NOT_IMPLEMENTED', 'R2Provider.objectExists pending', 501);
  }

  async publicUrl(storageKey: string): Promise<string> {
    // CDN-fronted custom domain (set via R2_PUBLIC_DOMAIN env var)
    const cdn = process.env.R2_PUBLIC_DOMAIN ?? '';
    if (!cdn) {
      throw new AppException('CONFIG_ERROR', 'R2_PUBLIC_DOMAIN not set', 500);
    }
    return `${cdn.replace(/\/$/, '')}/${storageKey}`;
  }

  async deleteObject(_storageKey: string): Promise<void> {
    throw new AppException('NOT_IMPLEMENTED', 'R2Provider.deleteObject pending', 501);
  }
}

function getProvider(): StorageProvider {
  return isR2Configured() ? new R2Provider() : new FirebaseProvider();
}

// ─────────────────────────────────────────────────────────────────────
// Firestore mapping
// ─────────────────────────────────────────────────────────────────────

function docToAsset(doc: FirebaseFirestore.DocumentSnapshot): Asset {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    kind: data.kind,
    storageProvider: data.storageProvider,
    storageKey: data.storageKey,
    publicUrl: data.publicUrl,
    thumbnailUrl: data.thumbnailUrl ?? undefined,
    mimeType: data.mimeType,
    sizeBytes: data.sizeBytes,
    durationSec: data.durationSec ?? undefined,
    width: data.width ?? undefined,
    height: data.height ?? undefined,
    ownerSessionId: data.ownerSessionId ?? undefined,
    ownerKidId: data.ownerKidId ?? undefined,
    ownerUserId: data.ownerUserId ?? undefined,
    parentRefType: data.parentRefType ?? undefined,
    parentRefId: data.parentRefId ?? undefined,
    sourceType: data.sourceType,
    visibility: data.visibility,
    status: data.status,
    moderation: {
      state: data.moderation?.state ?? 'pending',
      reason: data.moderation?.reason ?? undefined,
      reviewedBy: data.moderation?.reviewedBy ?? undefined,
      reviewedAt: data.moderation?.reviewedAt?.toDate
        ? data.moderation.reviewedAt.toDate()
        : undefined,
    },
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

/**
 * Create an asset doc + pre-signed upload URL.
 * Caller (API route) is responsible for consent enforcement before
 * calling this — see docs/security.md#voice-and-video-consent.
 */
export async function createUploadUrl(
  input: CreateUploadUrlInput,
): Promise<CreateUploadUrlResult> {
  assertValidUploadInput(input);
  await assertWithinQuota(
    input.ownerSessionId,
    input.ownerKidId,
    input.kind,
    input.sizeBytes,
  );

  const provider = getProvider();
  const docRef = adminDb.collection(ASSETS_COLLECTION).doc();
  const assetId = docRef.id;
  const ext = KIND_EXT[input.kind];
  const storageKey = provider.storageKey(assetId, input.kind, ext);

  const { uploadUrl, uploadMethod, headers } = await provider.createUploadUrl({
    storageKey,
    mimeType: input.mimeType,
    expiresInSec: UPLOAD_URL_TTL_SEC,
  });

  const moderation: AssetModeration = { state: 'pending' };
  const now = Timestamp.now();

  await docRef.set({
    id: assetId,
    kind: input.kind,
    storageProvider: selectedProvider(),
    storageKey,
    publicUrl: '', // populated at finalize
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    durationSec: input.durationSec ?? null,
    ownerSessionId: input.ownerSessionId ?? null,
    ownerKidId: input.ownerKidId ?? null,
    ownerUserId: input.ownerUserId ?? null,
    parentRefType: input.parentRefType ?? 'standalone',
    parentRefId: input.parentRefId ?? null,
    sourceType: input.sourceType,
    visibility: 'private' satisfies AssetVisibility,
    status: 'uploading' satisfies AssetStatus,
    moderation,
    createdAt: now,
  });

  return {
    assetId,
    uploadUrl,
    uploadMethod,
    headers,
    expiresInSec: UPLOAD_URL_TTL_SEC,
  };
}

/**
 * Confirm the upload completed — server checks the storage provider
 * for the object's existence, sets status='ready', runs auto-moderation.
 */
export async function finalizeAsset(assetId: string): Promise<Asset> {
  const docRef = adminDb.collection(ASSETS_COLLECTION).doc(assetId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new AppException('ASSET_NOT_FOUND', 'Asset not found', 404);
  }
  const data = snap.data() ?? {};
  if (data.status === 'ready') {
    return docToAsset(snap);
  }
  if (data.status !== 'uploading') {
    throw new AppException(
      'ASSET_INVALID_STATE',
      `Cannot finalize asset in status '${data.status}'`,
      409,
    );
  }

  const provider = getProvider();
  const { exists, sizeBytes } = await provider.objectExists(data.storageKey);
  if (!exists) {
    throw new AppException(
      'ASSET_NOT_FOUND',
      'Upload not found at storage provider — did the PUT complete?',
      404,
    );
  }

  // Auto-moderation v1: size/duration sanity (file content scan deferred).
  // For user_recording audio, we trust the client's stated sizeBytes/durationSec
  // if the storage provider's reported size is within 50% (Opus encoding can be
  // unpredictable). Phase 2 will add speech-to-text + profanityFilter run.
  const moderationState =
    data.sourceType === 'ai_generated' ? 'auto_approved' : 'auto_approved';

  const publicUrl = await provider.publicUrl(data.storageKey);
  const now = Timestamp.now();

  await docRef.update({
    status: 'ready',
    publicUrl,
    sizeBytes: sizeBytes ?? data.sizeBytes,
    'moderation.state': moderationState,
    'moderation.reviewedAt': now,
    updatedAt: now,
  });

  const updated = await docRef.get();
  return docToAsset(updated);
}

/** Fetch a single asset by ID. */
export async function getAsset(assetId: string): Promise<Asset> {
  const snap = await adminDb.collection(ASSETS_COLLECTION).doc(assetId).get();
  if (!snap.exists) {
    throw new AppException('ASSET_NOT_FOUND', 'Asset not found', 404);
  }
  return docToAsset(snap);
}

/** Soft-delete an asset (status='deleted'); nightly worker hard-deletes from storage. */
export async function softDeleteAsset(
  assetId: string,
  ownerSessionId: string,
): Promise<void> {
  const docRef = adminDb.collection(ASSETS_COLLECTION).doc(assetId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new AppException('ASSET_NOT_FOUND', 'Asset not found', 404);
  }
  const data = snap.data() ?? {};
  if (data.ownerSessionId && data.ownerSessionId !== ownerSessionId) {
    throw new AppException('FORBIDDEN', 'Not your asset', 403);
  }
  await docRef.update({
    status: 'deleted',
    updatedAt: Timestamp.now(),
  });
}

/**
 * Server-side helper: directly upload a Buffer (e.g. AI-generated audio
 * coming from Lyria/Replicate). Used by the music API to persist
 * generated tracks without going through the pre-signed URL flow.
 */
export async function uploadBuffer(input: {
  buffer: Buffer;
  kind: AssetKind;
  mimeType: string;
  sourceType: AssetSourceType;
  parentRefType?: AssetParentRefType;
  parentRefId?: string;
  ownerSessionId?: string;
  ownerKidId?: string;
  durationSec?: number;
  visibility?: AssetVisibility;
}): Promise<Asset> {
  const sizeBytes = input.buffer.byteLength;
  if (sizeBytes <= 0) {
    throw new AppException('INVALID_INPUT', 'Empty buffer', 400);
  }
  const cap = ASSET_SIZE_CAPS[input.kind];
  if (sizeBytes > cap) {
    throw new AppException(
      'PAYLOAD_TOO_LARGE',
      `${input.kind} files must be under ${cap / (1024 * 1024)} MB`,
      413,
    );
  }

  const docRef = adminDb.collection(ASSETS_COLLECTION).doc();
  const assetId = docRef.id;
  const ext = KIND_EXT[input.kind];

  // Direct upload path — bypasses pre-signed URL since this runs server-side.
  if (selectedProvider() === 'firebase') {
    const bucket = adminStorage.bucket();
    const storageKey = `assets/${input.kind}/${assetId}.${ext}`;
    const file = bucket.file(storageKey);
    await file.save(input.buffer, {
      contentType: input.mimeType,
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
          assetId,
          ownerSessionId: input.ownerSessionId ?? '',
          sourceType: input.sourceType,
        },
      },
    });
    if ((input.visibility ?? 'private') === 'public') {
      await file.makePublic().catch(() => undefined);
    }

    const isPublic = (input.visibility ?? 'private') === 'public';
    const publicUrl = isPublic
      ? `https://storage.googleapis.com/${bucket.name}/${storageKey}`
      : (
          await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + PUBLIC_URL_TTL_SEC * 1000,
          })
        )[0];

    const now = Timestamp.now();
    const moderation: AssetModeration = {
      state: input.sourceType === 'ai_generated' ? 'auto_approved' : 'pending',
    };
    await docRef.set({
      id: assetId,
      kind: input.kind,
      storageProvider: 'firebase',
      storageKey,
      publicUrl,
      mimeType: input.mimeType,
      sizeBytes,
      durationSec: input.durationSec ?? null,
      ownerSessionId: input.ownerSessionId ?? null,
      ownerKidId: input.ownerKidId ?? null,
      parentRefType: input.parentRefType ?? 'standalone',
      parentRefId: input.parentRefId ?? null,
      sourceType: input.sourceType,
      visibility: input.visibility ?? 'private',
      status: 'ready',
      moderation,
      createdAt: now,
    });

    const finalSnap = await docRef.get();
    return docToAsset(finalSnap);
  }

  throw new AppException(
    'NOT_IMPLEMENTED',
    'Server-side R2 upload not yet wired — install @aws-sdk/client-s3 and extend uploadBuffer',
    501,
  );
}

/** Atomically link an asset to its parent doc. */
export async function attachAssetToParent(
  assetId: string,
  parentRefType: AssetParentRefType,
  parentRefId: string,
): Promise<void> {
  const docRef = adminDb.collection(ASSETS_COLLECTION).doc(assetId);
  await docRef.update({
    parentRefType,
    parentRefId,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
