/**
 * Phase 4 (ADMIN-005): persistence for teacher-owned question papers.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type {
  PaperBlueprint,
  QuestionPaperDraft,
} from '@/lib/ai/questionPaperGenerator';
import type { Locale } from '@/lib/i18n/locales';

const COLLECTION = 'questionPapers';

export type QuestionPaperStatus = 'draft' | 'finalized';

export interface QuestionPaperDoc {
  id: string;
  teacherUid: string;
  schoolId: string;
  subject: string;
  classGrade: string;
  chapterIds: string[];
  blueprint: PaperBlueprint;
  totalMarks: number;
  durationMinutes: number;
  locale: Locale;
  status: QuestionPaperStatus;
  draft: QuestionPaperDraft;
  createdAt: Date;
  updatedAt: Date;
}

interface QuestionPaperFirestore extends Omit<QuestionPaperDoc, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function toDoc(raw: QuestionPaperFirestore): QuestionPaperDoc {
  return {
    ...raw,
    createdAt: raw.createdAt.toDate(),
    updatedAt: raw.updatedAt.toDate(),
  };
}

export interface CreatePaperInput {
  teacherUid: string;
  schoolId: string;
  subject: string;
  classGrade: string;
  chapterIds: string[];
  blueprint: PaperBlueprint;
  totalMarks: number;
  durationMinutes: number;
  locale: Locale;
  draft: QuestionPaperDraft;
  status: QuestionPaperStatus;
}

export async function createQuestionPaper(
  input: CreatePaperInput,
): Promise<QuestionPaperDoc> {
  const ref = adminDb.collection(COLLECTION).doc();
  const now = Timestamp.now();
  const doc: QuestionPaperFirestore = {
    id: ref.id,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return toDoc(doc);
}

export async function listQuestionPapersForTeacher(
  teacherUid: string,
  filters: { subject?: string; classGrade?: string } = {},
): Promise<QuestionPaperDoc[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where('teacherUid', '==', teacherUid)
    .get();
  return snap.docs
    .map((d) => toDoc(d.data() as QuestionPaperFirestore))
    .filter((d) => {
      if (filters.subject && d.subject !== filters.subject) return false;
      if (filters.classGrade && d.classGrade !== filters.classGrade) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getQuestionPaper(id: string): Promise<QuestionPaperDoc | null> {
  const snap = await adminDb.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return toDoc(snap.data() as QuestionPaperFirestore);
}

export async function updateQuestionPaper(
  id: string,
  actingUid: string,
  updates: Partial<
    Pick<QuestionPaperDoc, 'draft' | 'status' | 'totalMarks' | 'durationMinutes'>
  >,
): Promise<QuestionPaperDoc> {
  const ref = adminDb.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppException('NOT_FOUND', 'Question paper not found.', 404);
  }
  const data = snap.data() as QuestionPaperFirestore;
  if (data.teacherUid !== actingUid) {
    throw new AppException('FORBIDDEN', 'You can only edit your own papers.', 403);
  }
  const patch: Record<string, unknown> = { updatedAt: Timestamp.now() };
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) patch[k] = v;
  }
  await ref.update(patch);
  const updated = await ref.get();
  return toDoc(updated.data() as QuestionPaperFirestore);
}
