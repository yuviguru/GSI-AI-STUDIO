import { NextRequest } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';
import type { HybridAuthResult, UserRole } from '@/types/user.types';

/**
 * Verify Firebase ID token from Authorization header.
 * Throws 401 if missing or invalid.
 */
export async function verifyAuth(request: NextRequest): Promise<DecodedIdToken> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AppException('UNAUTHORIZED', 'Missing auth token', 401);
  }

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    throw new AppException('UNAUTHORIZED', 'Invalid or expired auth token', 401);
  }
}

/**
 * Hybrid auth — supports both anonymous (X-Session-Id) and authenticated (Bearer token).
 * Returns anonymous result if only session header present, authenticated if Bearer token present.
 * Throws 401 if neither header is present.
 */
export async function hybridAuth(request: NextRequest): Promise<HybridAuthResult> {
  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    try {
      const user = await adminAuth.verifyIdToken(token);
      return { type: 'authenticated', user };
    } catch {
      throw new AppException('UNAUTHORIZED', 'Invalid or expired auth token', 401);
    }
  }

  const sessionId = request.headers.get('X-Session-Id');
  if (sessionId) {
    return { type: 'anonymous', sessionId };
  }

  throw new AppException('UNAUTHORIZED', 'Missing auth token or session ID', 401);
}

/**
 * Require authenticated user with one of the specified roles.
 * Verifies token first, then checks role from Firestore user doc.
 */
export async function requireRole(
  request: NextRequest,
  roles: UserRole[]
): Promise<DecodedIdToken> {
  const user = await verifyAuth(request);

  // Import dynamically to avoid circular deps
  const { getUser } = await import('@/lib/firebase/userService');
  const userDoc = await getUser(user.uid);

  if (!userDoc || !roles.includes(userDoc.role)) {
    throw new AppException('FORBIDDEN', 'Insufficient permissions', 403);
  }

  return user;
}
