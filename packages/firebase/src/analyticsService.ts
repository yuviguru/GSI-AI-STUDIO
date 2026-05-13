import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { getAllConcepts, getConcept } from '@/lib/curriculum/curriculumMap';
import type { SchoolAnalyticsDoc, SchoolDoc } from '@gsi/types';
import type { CreationType } from '@gsi/types';

const SCHOOLS_COLLECTION = 'schools';
const CLASSES_SUBCOLLECTION = 'classes';
const ASSIGNMENTS_COLLECTION = 'assignments';
const SUBMISSIONS_COLLECTION = 'submissions';
const CREATIONS_COLLECTION = 'creations';
const USERS_COLLECTION = 'users';
const KIDS_COLLECTION = 'kids';
const ANALYTICS_COLLECTION = 'schoolAnalytics';

const CREATION_TYPES: CreationType[] = ['story', 'music', 'quiz', 'game', 'comic'];

interface CachedAnalytics extends Omit<SchoolAnalyticsDoc, 'updatedAt'> {
  updatedAt: Timestamp;
}

function weekKey(d: Date): string {
  // ISO-like YYYY-Www label (Monday-anchored), used purely for display.
  const year = d.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const diffDays = Math.floor((d.getTime() - start) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((diffDays + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export async function getCachedAnalytics(
  schoolId: string,
): Promise<SchoolAnalyticsDoc | null> {
  const doc = await adminDb.collection(ANALYTICS_COLLECTION).doc(schoolId).get();
  if (!doc.exists) return null;
  const data = doc.data() as CachedAnalytics;
  return {
    ...data,
    updatedAt: data.updatedAt.toDate(),
    // Timestamps inside nested arrays don't auto-convert; surface them as
    // JS Dates so the client receives ISO strings after JSON.stringify.
    teacherActivity: (data.teacherActivity ?? []).map((t) => {
      const raw = t.lastActiveAt as unknown;
      let lastActiveAt: Date | undefined;
      if (raw && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
        lastActiveAt = (raw as { toDate: () => Date }).toDate();
      } else if (raw instanceof Date) {
        lastActiveAt = raw;
      }
      return { ...t, lastActiveAt };
    }),
  };
}

/**
 * Aggregate per-school analytics on-demand. Writes the result to the
 * `schoolAnalytics/{schoolId}` cache doc. Designed to be idempotent and
 * safe to call from both the admin UI (with `?refresh=1`) and the daily
 * scheduled Netlify function.
 */
export async function refreshSchoolAnalytics(
  schoolId: string,
): Promise<SchoolAnalyticsDoc> {
  const schoolDoc = await adminDb.collection(SCHOOLS_COLLECTION).doc(schoolId).get();
  if (!schoolDoc.exists) {
    throw new Error(`School ${schoolId} not found`);
  }
  const school = schoolDoc.data() as SchoolDoc & {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
  };

  // Gather classes + their studentKidIds
  const classesSnap = await adminDb
    .collection(SCHOOLS_COLLECTION)
    .doc(schoolId)
    .collection(CLASSES_SUBCOLLECTION)
    .get();
  const classes = classesSnap.docs.map((d) => d.data() as {
    id: string;
    name: string;
    teacherUid: string;
    studentKidIds: string[];
  });
  const allKidIds = Array.from(
    new Set(classes.flatMap((c) => c.studentKidIds ?? [])),
  );
  const totalStudents = allKidIds.length;

  // Assignments + submissions
  const assignmentsSnap = await adminDb
    .collection(ASSIGNMENTS_COLLECTION)
    .where('schoolId', '==', schoolId)
    .get();
  const assignments = assignmentsSnap.docs.map((d) => d.data());

  const submissionsSnap = await adminDb
    .collection(SUBMISSIONS_COLLECTION)
    .where('schoolId', '==', schoolId)
    .get();
  const submissions = submissionsSnap.docs.map((d) => d.data());

  // Creations — filter by schoolId (stamped on submit, and any creation
  // authored by a kid whose schoolId matches will also be stamped on next
  // activity). We sample recent creations + use kidId lookups for the last
  // 8 weeks.
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const creationsSnap = await adminDb
    .collection(CREATIONS_COLLECTION)
    .where('schoolId', '==', schoolId)
    .get();
  const creations = creationsSnap.docs.map((d) => d.data());

  const totalCreations = creations.length;
  const creationsByType: Record<CreationType, number> = {
    story: 0,
    music: 0,
    quiz: 0,
    game: 0,
    comic: 0,
  };
  for (const c of creations) {
    const t = c.type as CreationType;
    if (CREATION_TYPES.includes(t)) creationsByType[t] += 1;
  }

  // Weekly active students + creations (last 8 weeks)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const trendBuckets = new Map<string, { creations: number; studentIds: Set<string> }>();
  let creationsThisWeek = 0;
  const activeThisWeek = new Set<string>();

  for (const c of creations) {
    const createdAt = (c.createdAt as Timestamp)?.toDate?.() ?? new Date();
    if (createdAt < eightWeeksAgo) continue;
    const key = weekKey(createdAt);
    if (!trendBuckets.has(key)) {
      trendBuckets.set(key, { creations: 0, studentIds: new Set() });
    }
    trendBuckets.get(key)!.creations += 1;
    if (c.kidId) trendBuckets.get(key)!.studentIds.add(c.kidId as string);
    if (createdAt >= oneWeekAgo) {
      creationsThisWeek += 1;
      if (c.kidId) activeThisWeek.add(c.kidId as string);
    }
  }
  const weeklyTrend = [...trendBuckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([week, { creations, studentIds }]) => ({
      week,
      creations,
      students: studentIds.size,
    }));

  // Curriculum coverage: exposure per concept = distinct students who
  // either have the concept in their conceptsLearned OR submitted to an
  // assignment tagged with that concept.
  const conceptExposure = new Map<string, Set<string>>();

  const kidDocs = await batchIn(KIDS_COLLECTION, allKidIds);
  for (const kidDoc of kidDocs) {
    const concepts = (kidDoc.data.conceptsLearned ?? []) as string[];
    for (const id of concepts) {
      if (!getConcept(id)) continue;
      if (!conceptExposure.has(id)) conceptExposure.set(id, new Set());
      conceptExposure.get(id)!.add(kidDoc.id);
    }
  }

  const tagsByAssignment = new Map<string, string[]>();
  for (const a of assignments) {
    tagsByAssignment.set(a.id as string, (a.curriculumTags ?? []) as string[]);
  }
  for (const s of submissions) {
    const tags = tagsByAssignment.get(s.assignmentId as string) ?? [];
    for (const id of tags) {
      if (!getConcept(id)) continue;
      if (!conceptExposure.has(id)) conceptExposure.set(id, new Set());
      conceptExposure.get(id)!.add(s.kidId as string);
    }
  }

  const curriculumCoverage = getAllConcepts().map((c) => {
    const exposed = conceptExposure.get(c.id)?.size ?? 0;
    return {
      conceptId: c.id,
      conceptName: c.name,
      studentsExposed: exposed,
      percentage:
        totalStudents > 0 ? Math.round((exposed / totalStudents) * 100) : 0,
    };
  });

  // Teacher activity — assignments per teacher + approx. completion rate.
  const byTeacher = new Map<
    string,
    {
      teacherUid: string;
      teacherName: string;
      classes: number;
      assignmentsCreated: number;
      approved: number;
      total: number;
      lastActiveAt?: Date;
    }
  >();

  const teacherUids = Array.from(new Set(school.teacherIds ?? []));
  const teacherDocs = await batchIn(USERS_COLLECTION, teacherUids);
  const teacherNameById = new Map<string, string>();
  for (const t of teacherDocs) {
    const n = t.data.name as string | undefined;
    teacherNameById.set(t.id, n ?? 'Teacher');
  }

  for (const teacherUid of teacherUids) {
    byTeacher.set(teacherUid, {
      teacherUid,
      teacherName: teacherNameById.get(teacherUid) ?? 'Teacher',
      classes: 0,
      assignmentsCreated: 0,
      approved: 0,
      total: 0,
    });
  }
  for (const cls of classes) {
    const row = byTeacher.get(cls.teacherUid);
    if (row) row.classes += 1;
  }
  for (const a of assignments) {
    const uid = a.teacherUid as string;
    const row = byTeacher.get(uid) ?? {
      teacherUid: uid,
      teacherName: teacherNameById.get(uid) ?? 'Teacher',
      classes: 0,
      assignmentsCreated: 0,
      approved: 0,
      total: 0,
    };
    row.assignmentsCreated += 1;
    const updated = (a.updatedAt as Timestamp)?.toDate?.();
    if (updated && (!row.lastActiveAt || updated > row.lastActiveAt)) {
      row.lastActiveAt = updated;
    }
    byTeacher.set(uid, row);
  }
  for (const s of submissions) {
    const a = assignments.find((aa) => aa.id === s.assignmentId);
    if (!a) continue;
    const uid = a.teacherUid as string;
    const row = byTeacher.get(uid);
    if (!row) continue;
    row.total += 1;
    if (s.status === 'approved') row.approved += 1;
  }

  const teacherActivity = Array.from(byTeacher.values())
    .map((row) => ({
      teacherUid: row.teacherUid,
      teacherName: row.teacherName,
      classes: row.classes,
      assignmentsCreated: row.assignmentsCreated,
      avgCompletionRate:
        row.total > 0 ? Math.round((row.approved / row.total) * 100) : 0,
      lastActiveAt: row.lastActiveAt,
    }))
    .sort((a, b) => b.assignmentsCreated - a.assignmentsCreated);

  const result: SchoolAnalyticsDoc = {
    schoolId,
    totalStudents,
    activeStudentsThisWeek: activeThisWeek.size,
    totalCreations,
    creationsThisWeek,
    creationsByType,
    curriculumCoverage,
    teacherActivity,
    weeklyTrend,
    updatedAt: new Date(),
  };

  await adminDb
    .collection(ANALYTICS_COLLECTION)
    .doc(schoolId)
    .set({
      ...result,
      updatedAt: Timestamp.fromDate(result.updatedAt),
    });

  return result;
}

async function batchIn(
  collection: string,
  ids: string[],
): Promise<{ id: string; data: Record<string, unknown> }[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
  const out: { id: string; data: Record<string, unknown> }[] = [];
  for (const chunk of chunks) {
    const snap = await adminDb
      .collection(collection)
      .where('__name__', 'in', chunk)
      .get();
    for (const d of snap.docs) out.push({ id: d.id, data: d.data() });
  }
  return out;
}

/**
 * Rank all schools for the inter-school leaderboard. Uses the cached
 * analytics docs so each call is a cheap collection read. Scores are
 * compound: creations (50%) + curriculumCoverage% (30%) + activeStudent% (20%).
 */
export interface CompetitionEntry {
  schoolId: string;
  name: string;
  city: string;
  board: string;
  creations: number;
  curriculumCoverage: number;
  activeStudentPct: number;
  score: number;
  rank: number;
}

export async function buildInterSchoolLeaderboard(filter?: {
  board?: string;
  state?: string;
}): Promise<CompetitionEntry[]> {
  const analyticsSnap = await adminDb.collection(ANALYTICS_COLLECTION).get();
  if (analyticsSnap.empty) return [];

  const schoolIds = analyticsSnap.docs.map((d) => d.id);
  const schoolDocs = await batchIn(SCHOOLS_COLLECTION, schoolIds);
  const schoolById = new Map(schoolDocs.map((d) => [d.id, d.data]));

  const entries: Omit<CompetitionEntry, 'rank'>[] = [];
  for (const d of analyticsSnap.docs) {
    const a = d.data() as SchoolAnalyticsDoc;
    const school = schoolById.get(d.id);
    if (!school) continue;
    if (filter?.board && school.board !== filter.board) continue;
    if (filter?.state && school.state !== filter.state) continue;
    const concepts = a.curriculumCoverage ?? [];
    const avgCoverage =
      concepts.length > 0
        ? Math.round(
            concepts.reduce((sum, c) => sum + c.percentage, 0) / concepts.length,
          )
        : 0;
    const activePct =
      a.totalStudents > 0
        ? Math.round((a.activeStudentsThisWeek / a.totalStudents) * 100)
        : 0;
    const score =
      (a.totalCreations ?? 0) * 0.5 + avgCoverage * 3 + activePct * 2;
    entries.push({
      schoolId: d.id,
      name: school.name as string,
      city: school.city as string,
      board: school.board as string,
      creations: a.totalCreations ?? 0,
      curriculumCoverage: avgCoverage,
      activeStudentPct: activePct,
      score,
    });
  }
  entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, 20).map((e, i) => ({ ...e, rank: i + 1 }));
}
