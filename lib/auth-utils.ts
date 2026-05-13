import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';
import type { AuthContext, HybridAuthResult, UserRole, UserDoc } from '@gsi/types';

/**
 * Verify Firebase ID token from Authorization header.
 * Returns AuthContext with user role, plan, and optional kid/school IDs.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthContext> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AppException('UNAUTHORIZED', 'Missing auth token', 401);
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Fetch user doc for role and plan
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new AppException('USER_NOT_FOUND', 'User profile not found. Please register first.', 404);
    }

    const data = userDoc.data() as UserDoc;

    return {
      userId: uid,
      role: data.role,
      plan: data.plan || 'free',
      kidId: undefined, // Set by client via X-Kid-Id header or body
      schoolId: data.schoolId,
    };
  } catch (error) {
    if (error instanceof AppException) throw error;
    throw new AppException('UNAUTHORIZED', 'Invalid or expired auth token', 401);
  }
}

/**
 * Verify auth AND check that the caller has one of the required roles.
 */
export async function requireRole(
  request: NextRequest,
  roles: UserRole[]
): Promise<AuthContext> {
  const auth = await verifyAuth(request);
  if (!roles.includes(auth.role)) {
    throw new AppException(
      'FORBIDDEN',
      `This action requires one of these roles: ${roles.join(', ')}`,
      403
    );
  }
  return auth;
}

/**
 * Verify auth AND bind to a specific kid profile.
 *
 * Reads the active kid id from the `X-Active-Kid-Id` header (Kid CEO
 * convention — matches the existing Phase-2 studio pattern in
 * `/api/sessions/points`). Verifies that kid is owned by the authed user
 * before returning.
 *
 * Throws:
 *   - UNAUTHORIZED (401) — no/invalid Bearer token (via verifyAuth)
 *   - KID_REQUIRED (400) — Authorization OK but no X-Active-Kid-Id header
 *   - FORBIDDEN (403)    — kid doc exists but parentId !== auth.userId
 *   - NOT_FOUND (404)    — kid doc missing
 */
export async function requireAuthWithKid(
  request: NextRequest,
): Promise<{ userId: string; kidId: string; role: UserRole; plan: string }> {
  const auth = await verifyAuth(request);

  const kidId = request.headers.get('X-Active-Kid-Id');
  if (!kidId) {
    throw new AppException(
      'KID_REQUIRED',
      'Pick a kid profile first — this action needs an active kid.',
      400,
    );
  }

  const kidDoc = await adminDb.collection('kids').doc(kidId).get();
  if (!kidDoc.exists) {
    throw new AppException('NOT_FOUND', 'Kid profile not found.', 404);
  }
  if (kidDoc.data()?.parentId !== auth.userId) {
    throw new AppException(
      'FORBIDDEN',
      'That kid profile does not belong to you.',
      403,
    );
  }

  return {
    userId: auth.userId,
    kidId,
    role: auth.role,
    plan: auth.plan,
  };
}

/**
 * Hybrid auth: accepts EITHER X-Session-Id (anonymous) OR Authorization Bearer (authenticated).
 * Used during the transition period so existing API routes work with both auth modes.
 *
 * Priority: If Authorization header is present, it takes precedence over X-Session-Id.
 */
export async function hybridAuth(request: NextRequest): Promise<HybridAuthResult> {
  const authHeader = request.headers.get('Authorization');

  // If Authorization header present, try authenticated flow
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const auth = await verifyAuth(request);
      return { type: 'authenticated', auth };
    } catch {
      // Fall through to anonymous if token is invalid but session ID exists
    }
  }

  // Fall back to anonymous session
  const sessionId = request.headers.get('X-Session-Id');
  if (sessionId) {
    return { type: 'anonymous', sessionId };
  }

  throw new AppException(
    'UNAUTHORIZED',
    'Please sign in or provide a session ID',
    401
  );
}
