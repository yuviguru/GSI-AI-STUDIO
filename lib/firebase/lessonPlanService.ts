/**
 * Phase 4 (ADMIN-007): persistence for teacher-owned lesson plans.
 *
 * Plans are stored at the top level (`lessonPlans/{id}`) keyed by an
 * auto ID so multiple plans per chapter / per class are first-class.
 * Service is teacher-scoped — list / get filter by `teacherUid`.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type { LessonPlanDraft, StudioId } from '@/lib/ai/lessonPlanGenerator';
import type { Locale } from '@/lib/i18n/locales';

const COLLECTION = 'lessonPlans';

export interface LessonPlanDoc extends LessonPlanDraft {
  id: string;
  teacherUid: string;
  schoolId: string;
  subject: string;
  classGrade: string;
  chapterId: string;
  chapterName: string;
  durationMinutes: number;
  locale: Locale;
  studioPreference?: StudioId;
  linkedAssignmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LessonPlanFirestore extends Omit<LessonPlanDoc, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function toDoc(raw: LessonPlanFirestore): LessonPlanDoc {
  return {
    ...raw,
    createdAt: raw.createdAt.toDate(),
    updatedAt: raw.updatedAt.toDate(),
  };
}

export interface CreateLessonPlanInput {
  teacherUid: string;
  schoolId: string;
  subject: string;
  classGrade: string;
  chapterId: string;
  chapterName: string;
  durationMinutes: number;
  locale: Locale;
  studioPreference?: StudioId;
  draft: LessonPlanDraft;
}

export async function createLessonPlan(
  input: CreateLessonPlanInput,
): Promise<LessonPlanDoc> {
  const ref = adminDb.collection(COLLECTION).doc();
  const now = Timestamp.now();
  const doc: LessonPlanFirestore = {
    id: ref.id,
    teacherUid: input.teacherUid,
    schoolId: input.schoolId,
    subject: input.subject,
    classGrade: input.classGrade,
    chapterId: input.chapterId,
    chapterName: input.chapterName,
    durationMinutes: input.durationMinutes,
    locale: input.locale,
    studioPreference: input.studioPreference,
    ...input.draft,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return toDoc(doc);
}

export async function listLessonPlansForTeacher(
  teacherUid: string,
  filters: { subject?: string; classGrade?: string } = {},
): Promise<LessonPlanDoc[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where('teacherUid', '==', teacherUid)
    .get();
  const docs = snap.docs
    .map((d) => toDoc(d.data() as LessonPlanFirestore))
    .filter((d) => {
      if (filters.subject && d.subject !== filters.subject) return false;
      if (filters.classGrade && d.classGrade !== filters.classGrade) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return docs;
}

export async function getLessonPlan(id: string): Promise<LessonPlanDoc | null> {
  const snap = await adminDb.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return toDoc(snap.data() as LessonPlanFirestore);
}

export interface UpdateLessonPlanInput
  extends Partial<LessonPlanDraft> {
  durationMinutes?: number;
  studioPreference?: StudioId;
  linkedAssignmentId?: string;
}

export async function updateLessonPlan(
  id: string,
  actingUid: string,
  updates: UpdateLessonPlanInput,
): Promise<LessonPlanDoc> {
  const ref = adminDb.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppException('NOT_FOUND', 'Lesson plan not found.', 404);
  }
  const data = snap.data() as LessonPlanFirestore;
  if (data.teacherUid !== actingUid) {
    throw new AppException('FORBIDDEN', 'You can only edit your own lesson plans.', 403);
  }
  const patch: Record<string, unknown> = { updatedAt: Timestamp.now() };
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) patch[k] = v;
  }
  await ref.update(patch);
  const updated = await ref.get();
  return toDoc(updated.data() as LessonPlanFirestore);
}
