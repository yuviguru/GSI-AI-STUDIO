/**
 * Phase 4: log teacher AI generator usage + enforce per-teacher rate
 * limits. Feeds compliance reports (B4) and the data-register section of
 * COMPLIANCE-001.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';

const USAGE_COLLECTION = 'teacherAiUsage';
const RATE_COLLECTION = 'teacherAiRateLimits';

export type AiGenerator =
  | 'hpc'
  | 'questionPaper'
  | 'feedback'
  | 'lessonPlan'
  | 'ptm'
  | 'digest'
  | 'adhoc'
  | 'subInstructions';

export interface LogAiUsageInput {
  teacherUid: string;
  schoolId: string;
  generator: AiGenerator;
  kidId?: string;
  tokensIn?: number;
  tokensOut?: number;
  locale?: string;
}

/** Append a usage record. Fire-and-forget from the caller's POV. */
export async function logTeacherAiUsage(input: LogAiUsageInput): Promise<void> {
  const ref = adminDb.collection(USAGE_COLLECTION).doc();
  await ref.set({
    id: ref.id,
    teacherUid: input.teacherUid,
    schoolId: input.schoolId,
    generator: input.generator,
    kidId: input.kidId ?? null,
    tokensIn: input.tokensIn ?? 0,
    tokensOut: input.tokensOut ?? 0,
    locale: input.locale ?? 'en',
    timestamp: Timestamp.now(),
  });
}

interface RateWindowDoc {
  timestamps: number[];
  expiresAt: Timestamp;
}

/**
 * Sliding-window rate limit per teacher × generator. Throws RATE_LIMITED
 * when over cap. Matches the existing homeworkRateLimit pattern.
 */
export async function checkAndIncrementAiRate(params: {
  teacherUid: string;
  generator: AiGenerator;
  windowMs?: number;
  cap?: number;
}): Promise<void> {
  const windowMs = params.windowMs ?? 60 * 1000; // 1 minute
  const cap = params.cap ?? 30;
  const now = Date.now();
  const key = `${params.teacherUid}_${params.generator}`;
  const ref = adminDb.collection(RATE_COLLECTION).doc(key);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? (snap.data() as RateWindowDoc) : undefined;
    const fresh = (existing?.timestamps ?? []).filter((t) => now - t < windowMs);
    if (fresh.length >= cap) {
      throw new AppException(
        'RATE_LIMITED',
        `Too many AI requests, try again in a minute.`,
        429,
      );
    }
    fresh.push(now);
    tx.set(ref, {
      timestamps: fresh,
      expiresAt: Timestamp.fromMillis(now + windowMs * 2),
    });
  });
}
