/**
 * POST /api/comms/ptm — generate PTM talking points for a student.
 * Does not persist or send.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { generatePtmNote } from '@/lib/ai/ptmNoteGenerator';
import {
  checkAndIncrementAiRate,
  logTeacherAiUsage,
} from '@/lib/firebase/teacherAiUsageService';
import { requireConsent } from '@/lib/dpdp/consentService';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    await checkAndIncrementAiRate({
      teacherUid: auth.userId,
      generator: 'ptm',
      cap: 30,
    });

    const body = (await request.json()) as Record<string, unknown>;
    const kidId = typeof body.kidId === 'string' ? body.kidId : '';
    const term = typeof body.term === 'string' ? body.term.trim() : '';
    const termStart = typeof body.termStart === 'string' ? body.termStart : '';
    const locale: Locale = isSupportedLocale(body.locale) ? body.locale : 'en';
    if (!kidId || !term) {
      throw new AppException('INVALID_INPUT', 'kidId and term are required.', 400);
    }

    const kidSnap = await adminDb.collection('kids').doc(kidId).get();
    if (!kidSnap.exists) {
      throw new AppException('NOT_FOUND', 'Student not found.', 404);
    }
    if (kidSnap.data()?.schoolId !== auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Student is not in your school.', 403);
    }

    await requireConsent(kidId, 'ai_generation');

    const draft = await generatePtmNote({
      kidId,
      term,
      termStart:
        termStart || new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      locale,
    });

    await logTeacherAiUsage({
      teacherUid: auth.userId,
      schoolId: auth.schoolId,
      generator: 'ptm',
      kidId,
      locale,
    });

    return apiSuccess({ draft });
  } catch (error) {
    return handleApiError(error);
  }
}
