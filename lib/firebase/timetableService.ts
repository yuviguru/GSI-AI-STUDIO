/**
 * Phase 4 (ADMIN-008): teacher timetable persistence + sub-finder rules.
 *
 * Path: `teacherTimetable/{schoolId}/teachers/{teacherUid}` =
 *   { periods: { monday: [{periodIdx, subject, classId}], ... },
 *     subjects: string[],
 *     seniority: number,
 *     updatedAt: Timestamp }
 *
 * Hydrated either by a school admin via the Substitute Finder UI or
 * (later) from a third-party ERP via INTEGRATION-001's adapters.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import {
  WEEKDAYS,
  type TeacherTimetable,
  type TimetableSlot,
  type Weekday,
  type WeeklySchedule,
} from './timetableTypes';

export {
  WEEKDAYS,
  type TeacherTimetable,
  type TimetableSlot,
  type Weekday,
  type WeeklySchedule,
};

interface TeacherTimetableFirestore extends Omit<TeacherTimetable, 'updatedAt'> {
  updatedAt: Timestamp;
}

export interface SubCandidate {
  teacherUid: string;
  score: number;
  subjects: string[];
  seniority: number;
  recentSubLoad: number;
  reasoning: string[];
}

function teacherDoc(schoolId: string, teacherUid: string) {
  return adminDb
    .collection('teacherTimetable')
    .doc(schoolId)
    .collection('teachers')
    .doc(teacherUid);
}

function teachersCol(schoolId: string) {
  return adminDb.collection('teacherTimetable').doc(schoolId).collection('teachers');
}

function toDoc(raw: TeacherTimetableFirestore): TeacherTimetable {
  return {
    ...raw,
    periods: raw.periods ?? {},
    subjects: raw.subjects ?? [],
    seniority: typeof raw.seniority === 'number' ? raw.seniority : 0,
    recentSubLoad: typeof raw.recentSubLoad === 'number' ? raw.recentSubLoad : 0,
    updatedAt: raw.updatedAt.toDate(),
  };
}

function isWeekday(v: string): v is Weekday {
  return (WEEKDAYS as string[]).includes(v);
}

function sanitizePeriods(input: unknown): WeeklySchedule {
  const out: WeeklySchedule = {};
  if (!input || typeof input !== 'object') return out;
  for (const [day, slots] of Object.entries(input as Record<string, unknown>)) {
    if (!isWeekday(day)) continue;
    if (!Array.isArray(slots)) continue;
    out[day] = slots
      .map((s): TimetableSlot | null => {
        if (!s || typeof s !== 'object') return null;
        const r = s as Record<string, unknown>;
        if (
          typeof r.periodIdx !== 'number' ||
          typeof r.subject !== 'string' ||
          typeof r.classId !== 'string'
        ) {
          return null;
        }
        return {
          periodIdx: r.periodIdx,
          subject: r.subject.trim(),
          classId: r.classId.trim(),
        };
      })
      .filter((s): s is TimetableSlot => s !== null);
  }
  return out;
}

export async function getTeacherTimetable(
  schoolId: string,
  teacherUid: string,
): Promise<TeacherTimetable | null> {
  const snap = await teacherDoc(schoolId, teacherUid).get();
  if (!snap.exists) return null;
  return toDoc(snap.data() as TeacherTimetableFirestore);
}

export interface SaveTimetableInput {
  schoolId: string;
  teacherUid: string;
  periods: WeeklySchedule;
  subjects: string[];
  seniority: number;
}

export async function saveTeacherTimetable(
  input: SaveTimetableInput,
): Promise<TeacherTimetable> {
  const subjects = input.subjects
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 12);
  const seniority = Number.isFinite(input.seniority)
    ? Math.max(0, Math.floor(input.seniority))
    : 0;

  const ref = teacherDoc(input.schoolId, input.teacherUid);
  const doc: TeacherTimetableFirestore = {
    schoolId: input.schoolId,
    teacherUid: input.teacherUid,
    periods: sanitizePeriods(input.periods),
    subjects,
    seniority,
    recentSubLoad: 0,
    updatedAt: Timestamp.now(),
  };
  await ref.set(doc, { merge: true });
  const next = await ref.get();
  return toDoc(next.data() as TeacherTimetableFirestore);
}

export async function listTimetablesForSchool(
  schoolId: string,
): Promise<TeacherTimetable[]> {
  const snap = await teachersCol(schoolId).get();
  return snap.docs.map((d) => toDoc(d.data() as TeacherTimetableFirestore));
}

/**
 * Rank teachers free during the requested period by:
 *  - +50 if they teach the absent teacher's subject
 *  - +20 if they teach any overlapping subject
 *  - +seniority * 2 (capped 30)
 *  - -recentSubLoad * 5 (fairness)
 * Free === no slot at that weekday + periodIdx.
 */
export async function findFreeTeachersForPeriod(input: {
  schoolId: string;
  weekday: Weekday;
  periodIdx: number;
  absentTeacherUid: string;
  absentTeacherSubject?: string;
}): Promise<SubCandidate[]> {
  const all = await listTimetablesForSchool(input.schoolId);
  const absent = all.find((t) => t.teacherUid === input.absentTeacherUid);
  const subject = input.absentTeacherSubject ?? absent?.subjects[0];

  const candidates: SubCandidate[] = [];
  for (const t of all) {
    if (t.teacherUid === input.absentTeacherUid) continue;
    const slots = t.periods[input.weekday] ?? [];
    const busy = slots.some((s) => s.periodIdx === input.periodIdx);
    if (busy) continue;

    const reasoning: string[] = [];
    let score = 0;
    if (subject && t.subjects.includes(subject)) {
      score += 50;
      reasoning.push(`teaches ${subject}`);
    } else if (subject && t.subjects.some((s) => absent?.subjects.includes(s))) {
      score += 20;
      reasoning.push('overlapping subject area');
    } else {
      reasoning.push('free period');
    }
    const senBonus = Math.min(30, t.seniority * 2);
    score += senBonus;
    if (senBonus > 0) reasoning.push(`+${senBonus} seniority`);
    score -= (t.recentSubLoad ?? 0) * 5;
    if ((t.recentSubLoad ?? 0) > 0)
      reasoning.push(`-${(t.recentSubLoad ?? 0) * 5} recent sub load`);

    candidates.push({
      teacherUid: t.teacherUid,
      score,
      subjects: t.subjects,
      seniority: t.seniority,
      recentSubLoad: t.recentSubLoad ?? 0,
      reasoning,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export async function classAtPeriod(
  schoolId: string,
  teacherUid: string,
  weekday: Weekday,
  periodIdx: number,
): Promise<TimetableSlot | null> {
  const t = await getTeacherTimetable(schoolId, teacherUid);
  if (!t) return null;
  const slots = t.periods[weekday] ?? [];
  return slots.find((s) => s.periodIdx === periodIdx) ?? null;
}

/** Returns weekday string for a given JS Date (Monday=monday…). */
export function weekdayFromDate(date: Date): Weekday | null {
  const idx = date.getDay(); // 0=Sun
  if (idx === 0) return null;
  const map: Weekday[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return map[idx - 1] ?? null;
}

/** Bumps recentSubLoad on the assigned sub teacher. */
export async function recordSubAssignment(
  schoolId: string,
  subTeacherUid: string,
): Promise<void> {
  const ref = teacherDoc(schoolId, subTeacherUid);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data() as TeacherTimetableFirestore;
    tx.update(ref, {
      recentSubLoad: (data.recentSubLoad ?? 0) + 1,
      updatedAt: Timestamp.now(),
    });
  });
}

export class TimetableValidationError extends AppException {
  constructor(message: string) {
    super('INVALID_INPUT', message, 400);
  }
}
