import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type {
  SchoolDoc,
  SchoolBranding,
  SchoolPlan,
  ClassDoc,
  AssignmentDoc,
  Board,
} from '@gsi/types';
import type { CreationType } from '@gsi/types';

const SCHOOLS_COLLECTION = 'schools';
const CLASSES_SUBCOLLECTION = 'classes';
const ASSIGNMENTS_COLLECTION = 'assignments';
const USERS_COLLECTION = 'users';
const KIDS_COLLECTION = 'kids';
/**
 * Top-level registry `classInviteCodes/{code}` stores `{ schoolId, classId }`.
 * This replaces the previous `collectionGroup('classes').where('inviteCode')`
 * uniqueness check, which needed an explicit Firestore collection-group
 * index. Primary-key reads need no index and are dramatically faster.
 */
const CLASS_INVITE_CODES_COLLECTION = 'classInviteCodes';

// ─── Firestore shapes (server-side) ────────────────────────────────────────

interface SchoolDocFirestore {
  id: string;
  name: string;
  city: string;
  state: string;
  board: Board;
  schoolCode: string;
  adminUid: string;
  teacherIds: string[];
  studentCount: number;
  plan: SchoolPlan;
  branding?: SchoolBranding;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ClassDocFirestore {
  id: string;
  schoolId: string;
  name: string;
  grade: string;
  section?: string;
  teacherUid: string;
  studentKidIds: string[];
  inviteCode: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface AssignmentDocFirestore {
  id: string;
  schoolId: string;
  classId: string;
  teacherUid: string;
  title: string;
  description: string;
  creationType: CreationType;
  dueDate: Timestamp;
  curriculumTags: string[];
  templateId?: string;
  status: 'active' | 'closed';
  submissions: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCodeValue(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Reserve a unique invite code inside a running transaction. Probes the
 * `classInviteCodes/{code}` primary-key registry up to 10 times — no
 * composite/collection-group index required. Caller is responsible for
 * actually writing the class doc and registry entry within the same tx.
 */
async function reserveInviteCodeInTx(
  tx: FirebaseFirestore.Transaction,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCodeValue();
    const ref = adminDb.collection(CLASS_INVITE_CODES_COLLECTION).doc(code);
    const snap = await tx.get(ref);
    if (!snap.exists) return code;
  }
  throw new AppException(
    'INVITE_CODE_EXHAUSTED',
    'Could not generate a unique invite code, please try again.',
    500,
  );
}

function toSchoolDoc(doc: SchoolDocFirestore): SchoolDoc {
  return {
    ...doc,
    branding: doc.branding,
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate(),
  };
}

function toClassDoc(doc: ClassDocFirestore): ClassDoc {
  return {
    ...doc,
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate(),
  };
}

function toAssignmentDoc(doc: AssignmentDocFirestore): AssignmentDoc {
  return {
    ...doc,
    dueDate: doc.dueDate.toDate(),
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate(),
  };
}

// ─── Schools ────────────────────────────────────────────────────────────────

export interface CreateSchoolInput {
  name: string;
  city: string;
  state: string;
  board: Board;
  schoolCode: string;
  adminUid: string;
}

export async function findSchoolByCode(schoolCode: string): Promise<SchoolDoc | null> {
  const snap = await adminDb
    .collection(SCHOOLS_COLLECTION)
    .where('schoolCode', '==', schoolCode)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toSchoolDoc(snap.docs[0]!.data() as SchoolDocFirestore);
}

export async function createSchool(input: CreateSchoolInput): Promise<SchoolDoc> {
  const existing = await findSchoolByCode(input.schoolCode);
  if (existing) {
    throw new AppException(
      'SCHOOL_CODE_TAKEN',
      'That school code is already registered.',
      409,
    );
  }
  const now = Timestamp.now();
  const ref = adminDb.collection(SCHOOLS_COLLECTION).doc();
  const doc: SchoolDocFirestore = {
    id: ref.id,
    name: input.name,
    city: input.city,
    state: input.state,
    board: input.board,
    schoolCode: input.schoolCode,
    adminUid: input.adminUid,
    teacherIds: [input.adminUid],
    studentCount: 0,
    plan: 'trial',
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return toSchoolDoc(doc);
}

export async function getSchool(schoolId: string): Promise<SchoolDoc | null> {
  const doc = await adminDb.collection(SCHOOLS_COLLECTION).doc(schoolId).get();
  if (!doc.exists) return null;
  return toSchoolDoc(doc.data() as SchoolDocFirestore);
}

export async function attachTeacherToSchool(
  schoolId: string,
  teacherUid: string,
): Promise<SchoolDoc> {
  const ref = adminDb.collection(SCHOOLS_COLLECTION).doc(schoolId);
  await ref.update({
    teacherIds: FieldValue.arrayUnion(teacherUid),
    updatedAt: Timestamp.now(),
  });
  const updated = await ref.get();
  return toSchoolDoc(updated.data() as SchoolDocFirestore);
}

// ─── Phase 4 (ADMIN-009): Settings + branding ──────────────────────────────

export interface UpdateSchoolInput {
  name?: string;
  city?: string;
  state?: string;
  board?: Board;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function assertSchoolAdmin(
  schoolDoc: SchoolDocFirestore | undefined,
  actingUid: string,
): asserts schoolDoc is SchoolDocFirestore {
  if (!schoolDoc) {
    throw new AppException('NOT_FOUND', 'School not found.', 404);
  }
  if (schoolDoc.adminUid !== actingUid) {
    throw new AppException(
      'FORBIDDEN',
      'Only the school admin can change these settings.',
      403,
    );
  }
}

/**
 * Update school metadata (name, city, state, board). Admin-only.
 * Returns the updated doc.
 */
export async function updateSchool(
  schoolId: string,
  updates: UpdateSchoolInput,
  actingUid: string,
): Promise<SchoolDoc> {
  const ref = adminDb.collection(SCHOOLS_COLLECTION).doc(schoolId);
  const snap = await ref.get();
  assertSchoolAdmin(snap.data() as SchoolDocFirestore | undefined, actingUid);

  const patch: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (updates.name !== undefined) {
    const v = updates.name.trim();
    if (v.length < 2 || v.length > 120) {
      throw new AppException('INVALID_INPUT', 'Name must be 2-120 chars.', 400);
    }
    patch.name = v;
  }
  if (updates.city !== undefined) {
    const v = updates.city.trim();
    if (v.length < 2 || v.length > 80) {
      throw new AppException('INVALID_INPUT', 'City must be 2-80 chars.', 400);
    }
    patch.city = v;
  }
  if (updates.state !== undefined) {
    const v = updates.state.trim();
    if (v.length < 2 || v.length > 80) {
      throw new AppException('INVALID_INPUT', 'State must be 2-80 chars.', 400);
    }
    patch.state = v;
  }
  if (updates.board !== undefined) {
    if (!['cbse', 'icse', 'state'].includes(updates.board)) {
      throw new AppException('INVALID_INPUT', 'Board must be cbse, icse, or state.', 400);
    }
    patch.board = updates.board;
  }

  await ref.update(patch);
  const updated = await ref.get();
  return toSchoolDoc(updated.data() as SchoolDocFirestore);
}

/**
 * Update branding colors. Admin-only. Logo / letterhead URLs are written by
 * the asset upload path (see `lib/storage/schoolAssets.ts`), not here.
 */
export async function updateSchoolBranding(
  schoolId: string,
  branding: Pick<SchoolBranding, 'primaryColor' | 'secondaryColor'>,
  actingUid: string,
): Promise<SchoolDoc> {
  const ref = adminDb.collection(SCHOOLS_COLLECTION).doc(schoolId);
  const snap = await ref.get();
  assertSchoolAdmin(snap.data() as SchoolDocFirestore | undefined, actingUid);

  const patch: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (branding.primaryColor !== undefined) {
    if (!HEX_COLOR.test(branding.primaryColor)) {
      throw new AppException('INVALID_INPUT', 'primaryColor must be #RRGGBB.', 400);
    }
    patch['branding.primaryColor'] = branding.primaryColor;
  }
  if (branding.secondaryColor !== undefined) {
    if (!HEX_COLOR.test(branding.secondaryColor)) {
      throw new AppException('INVALID_INPUT', 'secondaryColor must be #RRGGBB.', 400);
    }
    patch['branding.secondaryColor'] = branding.secondaryColor;
  }

  await ref.update(patch);
  const updated = await ref.get();
  return toSchoolDoc(updated.data() as SchoolDocFirestore);
}

/**
 * Writes a branding asset URL (logo / letterhead) onto the school doc.
 * Called by the storage layer after upload; admin-only enforcement lives at
 * the API route boundary.
 */
export async function setSchoolBrandingAssetUrl(
  schoolId: string,
  kind: 'logo' | 'letterhead',
  url: string | null,
): Promise<void> {
  const ref = adminDb.collection(SCHOOLS_COLLECTION).doc(schoolId);
  const field = kind === 'logo' ? 'branding.logoUrl' : 'branding.letterheadUrl';
  await ref.update({
    [field]: url ?? FieldValue.delete(),
    updatedAt: Timestamp.now(),
  });
}

/** Update the plan tier. Admin-only. */
export async function setSchoolPlan(
  schoolId: string,
  plan: SchoolPlan,
  actingUid: string,
): Promise<SchoolDoc> {
  if (!['trial', 'basic', 'premium'].includes(plan)) {
    throw new AppException('INVALID_INPUT', 'Plan must be trial, basic, or premium.', 400);
  }
  const ref = adminDb.collection(SCHOOLS_COLLECTION).doc(schoolId);
  const snap = await ref.get();
  assertSchoolAdmin(snap.data() as SchoolDocFirestore | undefined, actingUid);
  await ref.update({ plan, updatedAt: Timestamp.now() });
  const updated = await ref.get();
  return toSchoolDoc(updated.data() as SchoolDocFirestore);
}

// ─── Phase 4 (ADMIN-004): HPC narratives ──────────────────────────────────

export type HpcStatus = 'draft' | 'published';

export interface HpcNarrativeDoc {
  id: string;
  kidId: string;
  schoolId: string;
  term: string;
  locale: 'en' | 'hi';
  cognitive: string;
  affective: string;
  psychomotor: string;
  nextTermFocus?: string;
  teacherTags: string[];
  status: HpcStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface HpcNarrativeDocFirestore extends Omit<HpcNarrativeDoc, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function toHpc(raw: HpcNarrativeDocFirestore): HpcNarrativeDoc {
  return {
    ...raw,
    createdAt: raw.createdAt.toDate(),
    updatedAt: raw.updatedAt.toDate(),
  };
}

function hpcRef(schoolId: string, kidId: string, term: string) {
  return adminDb
    .collection(SCHOOLS_COLLECTION)
    .doc(schoolId)
    .collection('students')
    .doc(kidId)
    .collection('hpcNarratives')
    .doc(term);
}

export interface SaveHpcInput {
  schoolId: string;
  kidId: string;
  term: string;
  locale: 'en' | 'hi';
  cognitive: string;
  affective: string;
  psychomotor: string;
  nextTermFocus?: string;
  teacherTags: string[];
  status: HpcStatus;
  actingUid: string;
}

export async function saveHpcNarrative(input: SaveHpcInput): Promise<HpcNarrativeDoc> {
  const ref = hpcRef(input.schoolId, input.kidId, input.term);
  const existing = await ref.get();
  const now = Timestamp.now();
  const doc: HpcNarrativeDocFirestore = {
    id: input.term,
    kidId: input.kidId,
    schoolId: input.schoolId,
    term: input.term,
    locale: input.locale,
    cognitive: input.cognitive,
    affective: input.affective,
    psychomotor: input.psychomotor,
    nextTermFocus: input.nextTermFocus,
    teacherTags: input.teacherTags,
    status: input.status,
    createdBy: input.actingUid,
    createdAt: existing.exists
      ? (existing.data() as HpcNarrativeDocFirestore).createdAt
      : now,
    updatedAt: now,
  };
  await ref.set(doc);
  return toHpc(doc);
}

export async function getHpcNarrative(
  schoolId: string,
  kidId: string,
  term: string,
): Promise<HpcNarrativeDoc | null> {
  const snap = await hpcRef(schoolId, kidId, term).get();
  if (!snap.exists) return null;
  return toHpc(snap.data() as HpcNarrativeDocFirestore);
}

export async function listHpcNarrativesForClass(
  schoolId: string,
  classId: string,
  term: string,
): Promise<HpcNarrativeDoc[]> {
  const classDoc = await adminDb
    .collection(SCHOOLS_COLLECTION)
    .doc(schoolId)
    .collection(CLASSES_SUBCOLLECTION)
    .doc(classId)
    .get();
  if (!classDoc.exists) return [];
  const kidIds = ((classDoc.data() as ClassDocFirestore).studentKidIds ?? []) as string[];
  const results: HpcNarrativeDoc[] = [];
  for (const kidId of kidIds) {
    const snap = await hpcRef(schoolId, kidId, term).get();
    if (snap.exists) results.push(toHpc(snap.data() as HpcNarrativeDocFirestore));
  }
  return results;
}

// ─── Classes ────────────────────────────────────────────────────────────────

export interface CreateClassInput {
  schoolId: string;
  name: string;
  grade: string;
  section?: string;
  teacherUid: string;
}

export async function createClass(input: CreateClassInput): Promise<ClassDoc> {
  const classRef = adminDb
    .collection(SCHOOLS_COLLECTION)
    .doc(input.schoolId)
    .collection(CLASSES_SUBCOLLECTION)
    .doc();

  // Mint the invite code + write class + registry entry atomically.
  const doc = await adminDb.runTransaction(async (tx) => {
    const inviteCode = await reserveInviteCodeInTx(tx);
    const now = Timestamp.now();
    const classData: ClassDocFirestore = {
      id: classRef.id,
      schoolId: input.schoolId,
      name: input.name,
      grade: input.grade,
      section: input.section,
      teacherUid: input.teacherUid,
      studentKidIds: [],
      inviteCode,
      createdAt: now,
      updatedAt: now,
    };
    tx.set(classRef, classData);
    tx.set(adminDb.collection(CLASS_INVITE_CODES_COLLECTION).doc(inviteCode), {
      schoolId: input.schoolId,
      classId: classRef.id,
      createdAt: now,
    });
    return classData;
  });

  return toClassDoc(doc);
}

export async function getClass(
  schoolId: string,
  classId: string,
): Promise<ClassDoc | null> {
  const doc = await adminDb
    .collection(SCHOOLS_COLLECTION)
    .doc(schoolId)
    .collection(CLASSES_SUBCOLLECTION)
    .doc(classId)
    .get();
  if (!doc.exists) return null;
  return toClassDoc(doc.data() as ClassDocFirestore);
}

/**
 * Classes within a school. Sorted in memory on createdAt so a single-field
 * (auto-indexed) query is enough — no composite index needed.
 */
export async function listClassesForSchool(schoolId: string): Promise<ClassDoc[]> {
  const snap = await adminDb
    .collection(SCHOOLS_COLLECTION)
    .doc(schoolId)
    .collection(CLASSES_SUBCOLLECTION)
    .get();
  return snap.docs
    .map((d) => toClassDoc(d.data() as ClassDocFirestore))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Look up a class by invite code via the `classInviteCodes` registry.
 * Primary-key read — no index required.
 */
export async function findClassByInviteCode(
  inviteCode: string,
): Promise<ClassDoc | null> {
  const registryRef = adminDb
    .collection(CLASS_INVITE_CODES_COLLECTION)
    .doc(inviteCode);
  const registrySnap = await registryRef.get();
  if (!registrySnap.exists) return null;
  const { schoolId, classId } = registrySnap.data() as {
    schoolId: string;
    classId: string;
  };
  return getClass(schoolId, classId);
}

/**
 * Link a kid profile to a class. Idempotent — a kid already in the class is a
 * no-op. The school's `studentCount` counter only advances when this join is
 * the kid's *first* class in that school: re-joining, or joining a second
 * class in the same school, must not inflate the count.
 *
 * Runs in a transaction so concurrent joins don't double-increment.
 */
export async function joinClassByCode(
  inviteCode: string,
  kidId: string,
): Promise<ClassDoc> {
  const cls = await findClassByInviteCode(inviteCode);
  if (!cls) {
    throw new AppException('INVALID_CODE', 'That invite code is not recognised.', 400);
  }

  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(kidId);
  const classRef = adminDb
    .collection(SCHOOLS_COLLECTION)
    .doc(cls.schoolId)
    .collection(CLASSES_SUBCOLLECTION)
    .doc(cls.id);
  const schoolRef = adminDb.collection(SCHOOLS_COLLECTION).doc(cls.schoolId);

  const result = await adminDb.runTransaction(async (tx) => {
    const [kidSnap, classSnap] = await Promise.all([tx.get(kidRef), tx.get(classRef)]);
    if (!kidSnap.exists) {
      throw new AppException('KID_NOT_FOUND', 'Kid profile not found.', 404);
    }
    if (!classSnap.exists) {
      throw new AppException('NOT_FOUND', 'Class no longer exists.', 404);
    }
    const kidData = kidSnap.data()!;
    const latestClass = classSnap.data() as ClassDocFirestore;

    const alreadyInClass = (latestClass.studentKidIds ?? []).includes(kidId);
    const previousSchoolId: string | null = kidData.schoolId ?? null;
    const becomingNewStudentForSchool = previousSchoolId !== cls.schoolId;

    const now = Timestamp.now();

    tx.update(classRef, {
      studentKidIds: FieldValue.arrayUnion(kidId),
      updatedAt: now,
    });
    tx.update(kidRef, {
      schoolId: cls.schoolId,
      classIds: FieldValue.arrayUnion(cls.id),
      updatedAt: now,
    });
    if (!alreadyInClass && becomingNewStudentForSchool) {
      tx.update(schoolRef, {
        studentCount: FieldValue.increment(1),
        updatedAt: now,
      });
    }

    return { alreadyInClass, now };
  });

  return {
    ...cls,
    studentKidIds: result.alreadyInClass
      ? cls.studentKidIds
      : [...cls.studentKidIds, kidId],
    updatedAt: result.now.toDate(),
  };
}

export async function removeStudentFromClass(
  schoolId: string,
  classId: string,
  kidId: string,
): Promise<void> {
  const classRef = adminDb
    .collection(SCHOOLS_COLLECTION)
    .doc(schoolId)
    .collection(CLASSES_SUBCOLLECTION)
    .doc(classId);
  const schoolRef = adminDb.collection(SCHOOLS_COLLECTION).doc(schoolId);
  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(kidId);

  await adminDb.runTransaction(async (tx) => {
    const [classSnap, kidSnap] = await Promise.all([
      tx.get(classRef),
      tx.get(kidRef),
    ]);
    if (!classSnap.exists) {
      throw new AppException('NOT_FOUND', 'Class not found.', 404);
    }
    const classData = classSnap.data() as ClassDocFirestore;
    if (!classData.studentKidIds.includes(kidId)) return;

    // Does the kid still belong to another class in this school after we
    // remove them from this one? If yes, leave the school-wide counter alone.
    // Walk the other classes in this school (cheap — kids typically belong
    // to 1-3 classes) and check if any still include the kid.
    const kidClassIds: string[] = kidSnap.exists
      ? ((kidSnap.data()?.classIds as string[] | undefined) ?? [])
      : [];
    const otherClassIds = kidClassIds.filter((id) => id !== classId);
    let stillInSchool = false;
    for (const otherId of otherClassIds) {
      const otherSnap = await tx.get(
        adminDb
          .collection(SCHOOLS_COLLECTION)
          .doc(schoolId)
          .collection(CLASSES_SUBCOLLECTION)
          .doc(otherId),
      );
      if (otherSnap.exists) {
        stillInSchool = true;
        break;
      }
    }

    const now = Timestamp.now();
    tx.update(classRef, {
      studentKidIds: FieldValue.arrayRemove(kidId),
      updatedAt: now,
    });
    tx.update(kidRef, {
      classIds: FieldValue.arrayRemove(classId),
      updatedAt: now,
    });
    if (!stillInSchool) {
      tx.update(schoolRef, {
        studentCount: FieldValue.increment(-1),
        updatedAt: now,
      });
    }
  });
}

/**
 * Fetch student kid docs for a class. Returns light records — only the
 * fields the teacher roster needs.
 */
export interface ClassStudentSummary {
  id: string;
  name: string;
  avatar?: string;
  grade?: string;
  totalCreations: number;
  aiPoints: number;
  conceptsLearned: string[];
  lastActiveDate?: string;
}

export async function getClassStudents(
  schoolId: string,
  classId: string,
): Promise<ClassStudentSummary[]> {
  const cls = await getClass(schoolId, classId);
  if (!cls) return [];
  if (cls.studentKidIds.length === 0) return [];

  // Firestore `in` supports up to 30 IDs per query; chunk to be safe.
  const chunks: string[][] = [];
  for (let i = 0; i < cls.studentKidIds.length; i += 30) {
    chunks.push(cls.studentKidIds.slice(i, i + 30));
  }

  const results: ClassStudentSummary[] = [];
  for (const chunk of chunks) {
    const snap = await adminDb
      .collection(KIDS_COLLECTION)
      .where('__name__', 'in', chunk)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data();
      results.push({
        id: doc.id,
        name: data.name ?? 'Student',
        avatar: data.avatar,
        grade: data.grade,
        totalCreations: data.totalCreations ?? 0,
        aiPoints: data.aiPoints ?? 0,
        conceptsLearned: data.conceptsLearned ?? [],
        lastActiveDate: data.streak?.lastActiveDate,
      });
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Assignments ────────────────────────────────────────────────────────────

export interface CreateAssignmentInput {
  schoolId: string;
  classId: string;
  teacherUid: string;
  title: string;
  description: string;
  creationType: CreationType;
  dueDate: Date;
  curriculumTags: string[];
  templateId?: string;
}

export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<AssignmentDoc> {
  const now = Timestamp.now();
  const ref = adminDb.collection(ASSIGNMENTS_COLLECTION).doc();
  const doc: AssignmentDocFirestore = {
    id: ref.id,
    schoolId: input.schoolId,
    classId: input.classId,
    teacherUid: input.teacherUid,
    title: input.title,
    description: input.description,
    creationType: input.creationType,
    dueDate: Timestamp.fromDate(input.dueDate),
    curriculumTags: input.curriculumTags,
    templateId: input.templateId,
    status: 'active',
    submissions: 0,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return toAssignmentDoc(doc);
}

export async function getAssignment(
  assignmentId: string,
): Promise<AssignmentDoc | null> {
  const doc = await adminDb.collection(ASSIGNMENTS_COLLECTION).doc(assignmentId).get();
  if (!doc.exists) return null;
  return toAssignmentDoc(doc.data() as AssignmentDocFirestore);
}

/**
 * Sort in memory on createdAt so the Firestore query only needs the
 * single-field `teacherUid` index (auto-created). No composite index
 * required.
 */
export async function listAssignmentsForTeacher(
  teacherUid: string,
): Promise<AssignmentDoc[]> {
  const snap = await adminDb
    .collection(ASSIGNMENTS_COLLECTION)
    .where('teacherUid', '==', teacherUid)
    .get();
  return snap.docs
    .map((d) => toAssignmentDoc(d.data() as AssignmentDocFirestore))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function listAssignmentsForClass(
  classId: string,
): Promise<AssignmentDoc[]> {
  const snap = await adminDb
    .collection(ASSIGNMENTS_COLLECTION)
    .where('classId', '==', classId)
    .get();
  return snap.docs
    .map((d) => toAssignmentDoc(d.data() as AssignmentDocFirestore))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export async function listAssignmentsForKid(kidId: string): Promise<AssignmentDoc[]> {
  const kidDoc = await adminDb.collection(KIDS_COLLECTION).doc(kidId).get();
  if (!kidDoc.exists) return [];
  const classIds: string[] = kidDoc.data()?.classIds ?? [];
  if (classIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < classIds.length; i += 30) {
    chunks.push(classIds.slice(i, i + 30));
  }

  const results: AssignmentDoc[] = [];
  for (const chunk of chunks) {
    const snap = await adminDb
      .collection(ASSIGNMENTS_COLLECTION)
      .where('classId', 'in', chunk)
      .get();
    for (const d of snap.docs) {
      results.push(toAssignmentDoc(d.data() as AssignmentDocFirestore));
    }
  }
  return results.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export async function updateAssignment(
  assignmentId: string,
  teacherUid: string,
  input: {
    title?: string;
    description?: string;
    dueDate?: Date;
    curriculumTags?: string[];
    status?: 'active' | 'closed';
  },
): Promise<AssignmentDoc> {
  const ref = adminDb.collection(ASSIGNMENTS_COLLECTION).doc(assignmentId);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new AppException('NOT_FOUND', 'Assignment not found.', 404);
  }
  const data = doc.data() as AssignmentDocFirestore;
  if (data.teacherUid !== teacherUid) {
    throw new AppException(
      'FORBIDDEN',
      'You can only edit assignments you created.',
      403,
    );
  }
  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.dueDate !== undefined) updates.dueDate = Timestamp.fromDate(input.dueDate);
  if (input.curriculumTags !== undefined) updates.curriculumTags = input.curriculumTags;
  if (input.status !== undefined) updates.status = input.status;
  await ref.update(updates);
  const updated = await ref.get();
  return toAssignmentDoc(updated.data() as AssignmentDocFirestore);
}

// ─── Role helpers ──────────────────────────────────────────────────────────

/**
 * Promote the user doc to `teacher`. Idempotent — safe to call repeatedly.
 * Role lives on the Firestore user doc (no custom claims).
 */
export async function promoteUserToTeacher(
  uid: string,
  schoolId: string,
): Promise<void> {
  await adminDb.collection(USERS_COLLECTION).doc(uid).update({
    role: 'teacher',
    schoolId,
    updatedAt: Timestamp.now(),
  });
}

export async function setSchoolAdmin(uid: string, schoolId: string): Promise<void> {
  await adminDb.collection(USERS_COLLECTION).doc(uid).update({
    role: 'schoolAdmin',
    schoolId,
    updatedAt: Timestamp.now(),
  });
}
