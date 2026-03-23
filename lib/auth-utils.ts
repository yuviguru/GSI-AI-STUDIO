import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';
import type { AuthContext, HybridAuthResult, UserRole, UserDoc } from '@/types/user.types';

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
