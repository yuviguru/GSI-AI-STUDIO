/**
 * Asset types — unified binary-media metadata layer (PERF-001).
 * Payloads live in object storage (Cloudflare R2 in prod, Firebase
 * Storage as fallback). This collection only stores metadata + URL.
 *
 * See docs/data-model.md#assets and docs/architecture.md#storage.
 */

export type AssetKind = 'audio' | 'video' | 'image' | 'pdf';
export type AssetStorageProvider = 'r2' | 'firebase' | 'replicate';
export type AssetStatus = 'uploading' | 'ready' | 'flagged' | 'deleted';
export type AssetVisibility = 'private' | 'public' | 'class';
export type AssetSourceType = 'ai_generated' | 'user_recording' | 'user_upload';
export type AssetParentRefType = 'creation' | 'performance' | 'standalone';

export type AssetModerationState =
  | 'pending'
  | 'auto_approved'
  | 'approved'
  | 'flagged';

export interface AssetModeration {
  state: AssetModerationState;
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface Asset {
  id: string;
  kind: AssetKind;
  storageProvider: AssetStorageProvider;
  storageKey: string;
  publicUrl: string;
  thumbnailUrl?: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  width?: number;
  height?: number;
  ownerSessionId?: string;
  ownerKidId?: string;
  ownerUserId?: string;
  parentRefType?: AssetParentRefType;
  parentRefId?: string;
  sourceType: AssetSourceType;
  visibility: AssetVisibility;
  status: AssetStatus;
  moderation: AssetModeration;
  createdAt: Date;
  expiresAt?: Date;
}

/** Request body for POST /api/assets/upload-url */
export interface AssetUploadUrlRequest {
  kind: AssetKind;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  sourceType: AssetSourceType;
  parentRefType?: AssetParentRefType;
  parentRefId?: string;
}

/** Response from POST /api/assets/upload-url */
export interface AssetUploadUrlResponse {
  assetId: string;
  uploadUrl: string;
  uploadMethod: 'PUT' | 'POST';
  headers: Record<string, string>;
  expiresInSec: number;
}

/** Response from POST /api/assets/finalize */
export interface AssetFinalizeResponse {
  asset: Asset;
}
