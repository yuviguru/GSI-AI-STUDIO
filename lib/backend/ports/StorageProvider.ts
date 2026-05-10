/**
 * StorageProvider port — backend-neutral object storage.
 *
 * Today: Firebase Storage. Tomorrow: Supabase Storage / S3 / R2.
 *
 * Always issues signed URLs — never returns raw bucket paths. The client
 * uploads directly via signed URL (no bytes go through our server).
 */

export interface UploadUrlOptions {
  /** MIME type the client will upload (must match the upload exactly). */
  contentType: string;
  /** How long the signed URL stays valid. */
  expiresInSec: number;
  /** Maximum upload size in bytes. Adapters enforce where supported. */
  maxSizeBytes?: number;
}

export interface SignedUploadUrl {
  url: string;
  /** HTTP method the client should use. */
  method: 'PUT' | 'POST';
  /** Headers the client must send (e.g. Content-Type). */
  headers: Record<string, string>;
}

export interface StorageProvider {
  /** Get a signed URL the client can PUT/POST to upload directly. */
  getUploadUrl(path: string, opts: UploadUrlOptions): Promise<SignedUploadUrl>;

  /**
   * Get a URL for downloading the object.
   * If expiresInSec is provided, returns a signed URL.
   * Otherwise returns the public URL (only valid if the object is public).
   */
  getDownloadUrl(path: string, expiresInSec?: number): Promise<string>;

  /** Delete an object. Idempotent. */
  delete(path: string): Promise<void>;

  /** Check whether an object exists. */
  exists(path: string): Promise<boolean>;
}
