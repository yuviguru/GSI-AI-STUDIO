/**
 * LocalProvider — the default SchoolDataProvider that reads from GSI's own
 * Firestore. Used whenever a school has no third-party ERP integration
 * configured (the common case at Phase 4 launch).
 *
 * - Roster: built from `classes` (subcollection of `schools/{schoolId}`)
 *   + `kids` where `schoolId` matches.
 * - Attendance: empty in Phase 4 v0 — GSI doesn't own attendance yet.
 *   Returning [] lets consumers (B3 sub finder, B4 compliance) degrade
 *   gracefully when no ERP is configured.
 * - Timetable: reads from the `teacherTimetable/{schoolId}/teachers/{uid}`
 *   collection introduced by ADMIN-008 (substitute finder). Returns []
 *   until that ships.
 */

import { adminDb } from '@gsi/firebase/admin';
import {
  registerSchoolDataProvider,
  type AttendanceRecord,
  type DateRange,
  type ProviderHealth,
  type RosterEntry,
  type SchoolDataProvider,
  type TimetableRecord,
} from '../schoolDataProvider';

export class LocalProvider implements SchoolDataProvider {
  readonly id = 'local' as const;

  async fetchRoster(schoolId: string): Promise<RosterEntry[]> {
    const classesSnap = await adminDb
      .collection('schools')
      .doc(schoolId)
      .collection('classes')
      .get();

    const results: RosterEntry[] = [];
    for (const classDoc of classesSnap.docs) {
      const cls = classDoc.data() as {
        id: string;
        studentKidIds?: string[];
        grade?: string;
        section?: string;
      };
      const kidIds = cls.studentKidIds ?? [];
      if (kidIds.length === 0) continue;
      // Firestore `in` is capped at 30 — batch manually.
      for (let i = 0; i < kidIds.length; i += 30) {
        const chunk = kidIds.slice(i, i + 30);
        const kidsSnap = await adminDb
          .collection('kids')
          .where('__name__', 'in', chunk)
          .get();
        for (const kidDoc of kidsSnap.docs) {
          const kid = kidDoc.data() as Record<string, unknown>;
          const createdAtField = kid.createdAt as { toDate?: () => Date } | undefined;
          results.push({
            kidId: kidDoc.id,
            classId: cls.id,
            name: (kid.name as string) ?? 'Student',
            grade: cls.grade ?? (kid.grade as string | undefined),
            section: cls.section,
            joinedAt: createdAtField?.toDate?.() ?? new Date(),
          });
        }
      }
    }
    return results;
  }

  async fetchAttendance(
    _schoolId: string,
    _range: DateRange,
  ): Promise<AttendanceRecord[]> {
    // GSI does not own an attendance collection yet. Returning [] lets
    // downstream code still render (and makes the attendance-aware
    // features degrade to non-attendance signals).
    return [];
  }

  async fetchTimetable(schoolId: string): Promise<TimetableRecord[]> {
    const teachersSnap = await adminDb
      .collection('teacherTimetable')
      .doc(schoolId)
      .collection('teachers')
      .get();
    const out: TimetableRecord[] = [];
    for (const doc of teachersSnap.docs) {
      const data = doc.data() as {
        periods?: Record<string, Array<{ periodIdx: number; subject: string; classId: string }>>;
      };
      const periods = data.periods ?? {};
      for (const [weekday, slots] of Object.entries(periods)) {
        if (!isWeekday(weekday)) continue;
        for (const slot of slots ?? []) {
          out.push({
            teacherUid: doc.id,
            weekday,
            periodIdx: slot.periodIdx,
            subject: slot.subject,
            classId: slot.classId,
          });
        }
      }
    }
    return out;
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      // Touch a tiny doc to confirm Firestore is reachable.
      await adminDb.collection('schools').limit(1).get();
      return { id: this.id, ok: true, checkedAt: new Date() };
    } catch (err) {
      return {
        id: this.id,
        ok: false,
        message: err instanceof Error ? err.message : 'Unknown error',
        checkedAt: new Date(),
      };
    }
  }
}

function isWeekday(
  v: string,
): v is 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' {
  return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].includes(v);
}

const singleton = new LocalProvider();

registerSchoolDataProvider('local', async () => singleton);

export default singleton;
