import { NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth-utils';
import { createUser } from '@/lib/firebase/userService';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email().optional(),
  role: z.enum(['parent', 'teacher']).default('parent'),
});

/**
 * POST /api/auth/register
 * Create user profile after Firebase Phone Auth verification.
 * Idempotent — returns existing user if already registered.
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyAuth(request);

    const body = await request.json();
    const input = registerSchema.safeParse(body);
    if (!input.success) {
      throw new AppException('INVALID_INPUT', input.error.errors[0]?.message ?? 'Invalid input', 400);
    }

    const phone = decoded.phone_number;
    if (!phone) {
      throw new AppException('INVALID_INPUT', 'Phone number not found in token', 400);
    }

    const user = await createUser(
      decoded.uid,
      phone,
      input.data.name,
      input.data.role,
      input.data.email
    );

    return apiSuccess(
      {
        userId: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        plan: user.plan,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
