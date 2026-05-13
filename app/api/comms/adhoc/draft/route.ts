/**
 * POST /api/comms/adhoc/draft — draft an ad-hoc parent message.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { adminDb } from '@/lib/firebase/admin';
import { draftAdhocMessage, type Tone } from '@/lib/ai/adhocMessageDrafter';
import {
  checkAndIncrementAiRate,
  logTeacherAiUsage,
} from '@/lib/firebase/teacherAiUsageService';
import { requireConsent } from '@gsi/dpdp';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

const VALID_TONES: Tone[] = ['informative', 'concerned', 'congratulatory'];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }
    await checkAndIncrementAiRate({
      teacherUid: auth.userId,
      generator: 'adhoc',
      cap: 60,
    });

    const body = (await request.json()) as Record<string, unknown>;
    const kidId = typeof body.kidId === 'string' ? body.kidId : '';
    const intent = typeof body.teacherIntent === 'string' ? body.teacherIntent : '';
    const tone =
      typeof body.tone === 'string' && VALID_TONES.includes(body.tone as Tone)
        ? (body.tone as Tone)
        : 'informative';
    const locale: Locale = isSupportedLocale(body.locale) ? body.locale : 'en';
    if (!kidId || !intent) {
      throw new AppException('INVALID_INPUT', 'kidId and teacherIntent are required.', 400);
    }

    const kidSnap = await adminDb.collection('kids').doc(kidId).get();
    if (!kidSnap.exists) {
      throw new AppException('NOT_FOUND', 'Student not found.', 404);
    }
    if (kidSnap.data()?.schoolId !== auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Student is not in your school.', 403);
    }

    await requireConsent(kidId, 'ai_generation');

    const draft = await draftAdhocMessage({
      kidId,
      teacherIntent: intent,
      tone,
      locale,
    });

    await logTeacherAiUsage({
      teacherUid: auth.userId,
      schoolId: auth.schoolId,
      generator: 'adhoc',
      kidId,
      locale,
    });

    return apiSuccess({ draft });
  } catch (error) {
    return handleApiError(error);
  }
}
