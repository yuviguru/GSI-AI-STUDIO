import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { adminAuth } from '@/lib/firebase/admin';
import { claimSession } from '@/lib/firebase/userService';
import { MASCOTS } from '@/lib/mascots/roster';

const VALID_MASCOT_IDS = new Set(MASCOTS.map((m) => m.id));
const MAX_NAME = 30;
const MAX_AVATAR_URL = 2048;

interface OnboardingBody {
  name?: unknown;
  age?: unknown;
  mascotId?: unknown;
  avatarUrl?: unknown;
}

function sanitizeOnboarding(raw: OnboardingBody | undefined) {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: { name?: string; age?: number; mascotId?: string; avatarUrl?: string } = {};

  if (typeof raw.name === 'string') {
    const trimmed = raw.name.trim().slice(0, MAX_NAME);
    if (trimmed.length > 0) out.name = trimmed;
  }
  if (typeof raw.age === 'number' && raw.age >= 8 && raw.age <= 17) {
    out.age = Math.floor(raw.age);
  }
  if (typeof raw.mascotId === 'string' && VALID_MASCOT_IDS.has(raw.mascotId)) {
    out.mascotId = raw.mascotId;
  }
  if (typeof raw.avatarUrl === 'string' && raw.avatarUrl.length <= MAX_AVATAR_URL) {
    const url = raw.avatarUrl;
    const allowed =
      url.startsWith('https://firebasestorage.googleapis.com/') ||
      url.startsWith('https://storage.googleapis.com/') ||
      url.startsWith('https://image.pollinations.ai/') ||
      url.startsWith('/');
    if (allowed) out.avatarUrl = url;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * POST /api/auth/claim-session
 * Migrate anonymous session creations and points to an authenticated account.
 * Requires a valid Firebase ID token in the Authorization header.
 *
 * Idempotent: safe to call multiple times for the same session. Multiple
 * different sessions claimed before kid creation are MERGED (additive).
 *
 * Body:
 *   sessionId: string                  (required)
 *   onboarding?: { name, age, mascotId, avatarUrl }   — carried to first kid
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new AppException('UNAUTHORIZED', 'Missing auth token', 401);
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const phone = decoded.phone_number ?? undefined;

    const body = await request.json();
    const { sessionId, onboarding: rawOnboarding } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppException('INVALID_INPUT', 'Session ID is required', 400);
    }

    const onboarding = sanitizeOnboarding(rawOnboarding);

    const result = await claimSession(uid, sessionId, {
      phone,
      role: 'parent',
      onboarding,
    });

    return apiSuccess({
      claimedCreations: result.claimedCreations,
      pointsMigrated: result.pointsMigrated,
      message:
        result.claimedCreations > 0
          ? `${result.claimedCreations} creation(s) saved to your account!`
          : 'Session claimed successfully.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
