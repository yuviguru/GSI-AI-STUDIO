/**
 * Firebase AuthProvider adapter.
 *
 * Wraps `firebase-admin/auth` behind the AuthProvider port.
 */

import { adminAuth } from '@/lib/firebase/admin';
import type { AuthProvider, AuthUser } from '../ports/AuthProvider';

function fromFirebaseUser(record: {
  uid: string;
  phoneNumber?: string | null;
  email?: string | null;
  emailVerified?: boolean;
  customClaims?: Record<string, unknown>;
  metadata?: { creationTime?: string };
}): AuthUser {
  return {
    id: record.uid,
    phone: record.phoneNumber ?? undefined,
    email: record.email ?? undefined,
    emailVerified: record.emailVerified,
    customClaims: record.customClaims,
    createdAt: record.metadata?.creationTime,
  };
}

export class FirebaseAuthAdapter implements AuthProvider {
  async verifyToken(token: string): Promise<AuthUser> {
    const decoded = await adminAuth.verifyIdToken(token);
    const record = await adminAuth.getUser(decoded.uid);
    return fromFirebaseUser(record);
  }

  async getUser(id: string): Promise<AuthUser | null> {
    try {
      const record = await adminAuth.getUser(id);
      return fromFirebaseUser(record);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/user-not-found') return null;
      throw err;
    }
  }

  async setCustomClaims(id: string, claims: Record<string, unknown>): Promise<void> {
    await adminAuth.setCustomUserClaims(id, claims);
  }

  async createSessionCookie(idToken: string, expiresInMs: number): Promise<string> {
    return adminAuth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  }

  async verifySessionCookie(cookie: string): Promise<AuthUser> {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    const record = await adminAuth.getUser(decoded.uid);
    return fromFirebaseUser(record);
  }

  async revokeRefreshTokens(id: string): Promise<void> {
    await adminAuth.revokeRefreshTokens(id);
  }
}
