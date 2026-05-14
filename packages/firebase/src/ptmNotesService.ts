/**
 * COMMS-002: persisted parent-teacher meeting notes per (kid, term).
 *
 * Stored at `ptmNotes/{noteId}` with composite indexes on (schoolId, kidId,
 * createdAt desc) so the teacher inbox can scan a roster fast.
 *
 * Drafts are produced via `/api/comms/ptm` (AI). This service handles
 * persistence, listing, and lifecycle (sent / acknowledged).
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';

const COLLECTION = 'ptmNotes';

export type PtmNoteStatus = 'draft' | 'sent' | 'acknowledged';

export interface PtmNoteDoc {
  id: string;
  schoolId: string;
  classId: string;
  kidId: string;
  authorUid: string;
  term: string;
  body: string;
  status: PtmNoteStatus;
  /** Set when status flips to "sent". */
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PtmNoteFirestore extends Omit<PtmNoteDoc, 'sentAt' | 'createdAt' | 'updatedAt'> {
  sentAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function toDoc(raw: PtmNoteFirestore): PtmNoteDoc {
  return {
    ...raw,
    sentAt: raw.sentAt ? raw.sentAt.toDate() : null,
    createdAt: raw.createdAt.toDate(),
    updatedAt: raw.updatedAt.toDate(),
  };
}

export interface CreatePtmNoteInput {
  schoolId: string;
  classId: string;
  kidId: string;
  authorUid: string;
  term: string;
  body: string;
}

export async function createPtmNote(input: CreatePtmNoteInput): Promise<PtmNoteDoc> {
  const ref = adminDb.collection(COLLECTION).doc();
  const now = Timestamp.now();
  const doc: PtmNoteFirestore = {
    id: ref.id,
    schoolId: input.schoolId,
    classId: input.classId,
    kidId: input.kidId,
    authorUid: input.authorUid,
    term: input.term,
    body: input.body,
    status: 'draft',
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return toDoc(doc);
}

export async function getPtmNote(id: string): Promise<PtmNoteDoc | null> {
  const snap = await adminDb.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return toDoc(snap.data() as PtmNoteFirestore);
}

export async function listPtmNotesForClass(
  schoolId: string,
  classId: string,
): Promise<PtmNoteDoc[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where('schoolId', '==', schoolId)
    .where('classId', '==', classId)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  return snap.docs.map((d) => toDoc(d.data() as PtmNoteFirestore));
}

export async function listPtmNotesForKid(
  schoolId: string,
  kidId: string,
): Promise<PtmNoteDoc[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where('schoolId', '==', schoolId)
    .where('kidId', '==', kidId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map((d) => toDoc(d.data() as PtmNoteFirestore));
}

export type UpdatePtmNoteResult =
  | { status: 'updated'; note: PtmNoteDoc }
  | { status: 'not_found' }
  | { status: 'forbidden' };

/**
 * Authorize-then-write. Verifies the note belongs to `schoolId` *before*
 * mutating, so a guessed or leaked note id can't corrupt a foreign school's
 * records. Returns a tagged result so the caller can map to the right
 * HTTP status without inferring it from `null`.
 */
export async function updatePtmNote(
  id: string,
  schoolId: string,
  patch: Partial<Pick<PtmNoteDoc, 'body' | 'status'>>,
): Promise<UpdatePtmNoteResult> {
  const ref = adminDb.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { status: 'not_found' };
  const existing = snap.data() as PtmNoteFirestore;
  if (existing.schoolId !== schoolId) return { status: 'forbidden' };

  const now = Timestamp.now();
  const update: Partial<PtmNoteFirestore> = {
    ...patch,
    updatedAt: now,
  };
  if (patch.status === 'sent') update.sentAt = now;
  await ref.set(update, { merge: true });

  const after = await ref.get();
  return { status: 'updated', note: toDoc(after.data() as PtmNoteFirestore) };
}

export async function deletePtmNote(id: string, schoolId: string): Promise<boolean> {
  const ref = adminDb.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  if ((snap.data() as PtmNoteFirestore).schoolId !== schoolId) return false;
  await ref.delete();
  return true;
}
