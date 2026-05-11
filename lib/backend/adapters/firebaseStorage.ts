/**
 * Firebase Storage adapter.
 *
 * Issues v4 signed URLs for direct client uploads (PUT) and signed download
 * URLs for served reads.
 */

import { adminStorage } from '@/lib/firebase/admin';
import type {
  StorageProvider,
  UploadUrlOptions,
  SignedUploadUrl,
} from '../ports/StorageProvider';

export class FirebaseStorageAdapter implements StorageProvider {
  async getUploadUrl(
    path: string,
    opts: UploadUrlOptions,
  ): Promise<SignedUploadUrl> {
    const file = adminStorage.bucket().file(path);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + opts.expiresInSec * 1000,
      contentType: opts.contentType,
      // Note: maxSizeBytes is best-enforced server-side after upload (Firebase
      // signed URLs don't natively cap upload size). Adapters that DO support
      // this (S3 POST policies) should use `opts.maxSizeBytes`.
    });
    return {
      url,
      method: 'PUT',
      headers: { 'Content-Type': opts.contentType },
    };
  }

  async getDownloadUrl(path: string, expiresInSec?: number): Promise<string> {
    const file = adminStorage.bucket().file(path);
    if (expiresInSec) {
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInSec * 1000,
      });
      return url;
    }
    // Public URL — only works if the object has been made publicly readable.
    return `https://storage.googleapis.com/${adminStorage.bucket().name}/${encodeURIComponent(path)}`;
  }

  async delete(path: string): Promise<void> {
    try {
      await adminStorage.bucket().file(path).delete();
    } catch (err) {
      // Ignore "not found" — adapter contract says delete is idempotent.
      const code = (err as { code?: number }).code;
      if (code !== 404) throw err;
    }
  }

  async exists(path: string): Promise<boolean> {
    const [exists] = await adminStorage.bucket().file(path).exists();
    return exists;
  }
}
