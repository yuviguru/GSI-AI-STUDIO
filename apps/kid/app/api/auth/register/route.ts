import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminAuth } from '@gsi/firebase/admin';
import { createUser } from '@gsi/firebase/userService';
import type { UserRole } from '@gsi/types';

const VALID_ROLES: UserRole[] = ['parent', 'teacher'];

/**
 * POST /api/auth/register
 * Create a user profile after successful Firebase Phone Auth.
 * Requires a valid Firebase ID token in the Authorization header.
 *
 * No name is collected — the parent is just the account holder.
 * Age verification is handled client-side via consent checkbox.
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

    // 2. Parse request body (role is optional, defaults to parent)
    let role: UserRole = 'parent';
    try {
      const body = await request.json();
      if (body.role && VALID_ROLES.includes(body.role)) {
        role = body.role;
      }
    } catch {
      // Empty body is fine — defaults to parent
    }

    // 3. Create user document
    const userDoc = await createUser({ uid, phone, role });

    return apiSuccess({
      id: userDoc.id,
      phone: userDoc.phone,
      role: userDoc.role,
      plan: userDoc.plan,
      kidIds: userDoc.kidIds,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
