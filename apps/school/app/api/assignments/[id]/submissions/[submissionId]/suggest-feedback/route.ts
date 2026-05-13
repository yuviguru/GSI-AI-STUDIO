/**
 * POST /api/assignments/[id]/submissions/[submissionId]/suggest-feedback
 *
 * Phase 4 (ADMIN-006): Claude-drafted feedback suggestion for a teacher.
 * The teacher always edits and approves; we never persist or send.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth-utils';
import { getSubmissionWithContext } from '@gsi/firebase/submissionService';
import { adminDb } from '@gsi/firebase/admin';
import { suggestFeedback, type Locale } from '@gsi/ai/feedbackSuggester';
import {
  checkAndIncrementAiRate,
  logTeacherAiUsage,
} from '@gsi/firebase/teacherAiUsageService';
import { requireConsent } from '@gsi/dpdp';

function parseLocale(raw: unknown): Locale {
  if (raw === 'hi') return 'hi';
  return 'en';
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: { id: string; submissionId: string } },
) {
  try {
    const auth = await requireRole(request, ['teacher', 'schoolAdmin']);
    if (!auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Teacher is not attached to a school.', 403);
    }

    await checkAndIncrementAiRate({
      teacherUid: auth.userId,
      generator: 'feedback',
      // Explicit cap keeps this endpoint in line with the other AI
      // generators (M-3 defence-in-depth vs relying on the service default).
      cap: 30,
    });

    const submission = await getSubmissionWithContext(params.submissionId);
    if (!submission) {
      throw new AppException('NOT_FOUND', 'Submission not found.', 404);
    }
    if (submission.schoolId !== auth.schoolId) {
      throw new AppException('FORBIDDEN', 'Not your school.', 403);
    }
    if (submission.assignmentId !== params.id) {
      throw new AppException('INVALID_INPUT', 'Submission does not belong to this assignment.', 400);
    }

    // DPDP: require parent consent before running any AI generator on a
    // kid's data. Throws FORBIDDEN_CONSENT (403) when missing so the UI
    // can prompt the teacher to ask the parent.
    await requireConsent(submission.kidId, 'ai_generation');

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      // Body optional — default locale is fine.
    }
    const locale = parseLocale(body.locale);

    const assignmentSnap = await adminDb
      .collection('assignments')
      .doc(params.id)
      .get();
    const assignmentTitle =
      (assignmentSnap.data()?.title as string | undefined) ?? 'Untitled assignment';

    const draft = await suggestFeedback({
      submission,
      assignmentTitle,
      locale,
    });

    await logTeacherAiUsage({
      teacherUid: auth.userId,
      schoolId: auth.schoolId,
      generator: 'feedback',
      kidId: submission.kidId,
      tokensIn: draft.tokensIn,
      tokensOut: draft.tokensOut,
      locale,
    });

    return apiSuccess(draft);
  } catch (error) {
    return handleApiError(error);
  }
}
