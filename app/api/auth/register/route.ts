import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminAuth } from '@/lib/firebase/admin';
import { createUser } from '@/lib/firebase/userService';
import type { UserRole } from '@/types/user.types';

const VALID_ROLES: UserRole[] = ['parent', 'teacher'];

/**
 * POST /api/auth/register
 * Create a user profile after successful Firebase Phone Auth.
 * Requires a valid Firebase ID token in the Authorization header.
 *
 * Age verification is handled client-side via a consent checkbox
 * ("I am a parent/guardian, 18+ years old, and agree to T&C").
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify Firebase ID token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new AppException('UNAUTHORIZED', 'Missing auth token', 401);
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const phone = decoded.phone_number;

    if (!phone) {
      throw new AppException('INVALID_AUTH', 'Phone number not found in auth token', 400);
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { name, role } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new AppException('INVALID_INPUT', 'Name must be at least 2 characters', 400);
    }

    if (!role || !VALID_ROLES.includes(role)) {
      throw new AppException('INVALID_INPUT', `Role must be one of: ${VALID_ROLES.join(', ')}`, 400);
    }

    // 3. Create user document
    const userDoc = await createUser({
      uid,
      phone,
      name: name.trim(),
      role,
    });

    return apiSuccess({
      id: userDoc.id,
      phone: userDoc.phone,
      name: userDoc.name,
      role: userDoc.role,
      plan: userDoc.plan,
      kidIds: userDoc.kidIds,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
