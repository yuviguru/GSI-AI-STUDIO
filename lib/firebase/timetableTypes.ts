/**
 * Phase 4 (ADMIN-008) — isomorphic types and constants for the teacher
 * timetable. Kept separate from `timetableService.ts` (which imports
 * `firebase-admin`) so client components can pull in types + WEEKDAYS
 * without webpack trying to bundle `firebase-admin` for the browser.
 */

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export interface TimetableSlot {
  periodIdx: number;
  subject: string;
  classId: string;
}

export type WeeklySchedule = Partial<Record<Weekday, TimetableSlot[]>>;

export interface TeacherTimetable {
  schoolId: string;
  teacherUid: string;
  periods: WeeklySchedule;
  subjects: string[];
  seniority: number;
  recentSubLoad?: number;
  updatedAt: Date;
}

export interface SubCandidate {
  teacherUid: string;
  score: number;
  subjects: string[];
  seniority: number;
  recentSubLoad: number;
  reasoning: string[];
}
