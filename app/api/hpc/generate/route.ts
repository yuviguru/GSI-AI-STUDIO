/**
 * POST /api/hpc/generate — draft an HPC narrative. Does NOT persist.
 *
 * Teacher / schoolAdmin gated. Rate-limited per teacher. Enforces DPDP
 * consent (ai_generation) on the kid before invoking Claude.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { generateHpcNarrative, type Locale } from '@/lib/ai/hpcGenerator';
import {
  checkAndIncrementAiRate,
  logTeacherAiUsage,
} from '@/lib/firebase/teacherAiUsageService';
import { requireConsent } from '@gsi/dpdp';

function parseLocale(v: unknown): Locale {
  return v === 'hi' ? 'hi' : 'en';
}

async function assertKidInSchool(kidId: string, schoolId: string): Promise<void> {
  const kidSnap = await adminDb.collection('kids').doc(kidId).get();
  if (!kidSnap.exists) {
    throw new AppException('NOT_FOUND', 'Student not found.', 404);
  }
  if (kidSnap.data()?.schoolId !== schoolId) {
    throw new AppException('FORBIDDEN', 'Student is not in your school.', 403);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }

    await checkAndIncrementAiRate({
      teacherUid: auth.userId,
      generator: 'hpc',
      cap: 20, // HPC generation is more expensive — stricter cap.
    });

    const body = (await request.json()) as Record<string, unknown>;
    const kidId = typeof body.kidId === 'string' ? body.kidId : '';
    const term = typeof body.term === 'string' ? body.term.trim() : '';
    const termStart = typeof body.termStart === 'string' ? body.termStart : '';
    const teacherTagsRaw = Array.isArray(body.teacherTags) ? body.teacherTags : [];
    const locale = parseLocale(body.locale);

    if (!kidId) {
      throw new AppException('INVALID_INPUT', 'kidId is required.', 400);
    }
    if (term.length < 2 || term.length > 40) {
      throw new AppException('INVALID_INPUT', 'term must be 2-40 chars.', 400);
    }

    const teacherTags = teacherTagsRaw
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length < 60)
      .slice(0, 12);

    await assertKidInSchool(kidId, auth.schoolId);
    await requireConsent(kidId, 'ai_generation');

    const draft = await generateHpcNarrative({
      kidId,
      term,
      termStart: termStart || new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      locale,
      teacherTags,
    });

    await logTeacherAiUsage({
      teacherUid: auth.userId,
      schoolId: auth.schoolId,
      generator: 'hpc',
      kidId,
      locale,
    });

    return apiSuccess({ draft });
  } catch (error) {
    return handleApiError(error);
  }
}
