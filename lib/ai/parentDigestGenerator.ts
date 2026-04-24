/**
 * Phase 4 (COMMS-001): weekly parent digest content composer.
 *
 * Template-based, deterministic, and fast — no AI call needed for the
 * default digest. An optional Claude-written "summary" paragraph can be
 * enabled later (COMMS-002 PTM flow reuses similar patterns with AI).
 * Keeps send costs near zero at scale.
 */

import { adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';

export type Locale = 'en' | 'hi';

export interface ParentDigestContent {
  kidId: string;
  kidName: string;
  weekStart: Date;
  creationsThisWeek: number;
  approvedThisWeek: number;
  conceptsThisWeek: string[];
  upcomingAssignments: Array<{ title: string; dueDate: Date }>;
  teacherNote?: string;
  text: string;
}

/**
 * Strip Telegram / WhatsApp markdown metacharacters from free-form teacher
 * notes. The outbound provider sends with `parseMode: 'markdown'`, so an
 * unescaped `*bold*`, backtick, or `[label](url)` in a teacher-typed note
 * could render as a fake link / emphasised text and phish a parent.
 */
function sanitizeForTelegramMarkdown(input: string): string {
  return input.replace(/[*_`[\]()~]/g, '');
}

function startOfWeek(from: Date = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // target Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const STRINGS = {
  en: {
    header: (name: string, dateLabel: string) =>
      `*${name}'s week* (${dateLabel})`,
    creations: (approved: number, total: number) =>
      `Creations: ${approved} approved · ${total} total.`,
    noCreations: 'No new creations this week — a gentle nudge might help.',
    concepts: (list: string) => `AI concepts covered: ${list}.`,
    upcoming: (items: string) => `Upcoming: ${items}`,
    noUpcoming: 'No assignments due next week.',
    teacherNote: (note: string) => `Teacher note: "${note}"`,
    footer:
      'Reply STOP to pause these updates, or manage them in Data & privacy.',
  },
  hi: {
    header: (name: string, dateLabel: string) =>
      `*${name} का सप्ताह* (${dateLabel})`,
    creations: (approved: number, total: number) =>
      `रचनाएँ: ${approved} स्वीकृत · ${total} कुल।`,
    noCreations: 'इस सप्ताह कोई नई रचना नहीं — एक प्रेरणा मदद कर सकती है।',
    concepts: (list: string) => `AI अवधारणाएँ: ${list}।`,
    upcoming: (items: string) => `आगामी: ${items}`,
    noUpcoming: 'अगले सप्ताह कोई असाइनमेंट नहीं।',
    teacherNote: (note: string) => `शिक्षक टिप्पणी: "${note}"`,
    footer:
      'अपडेट बंद करने के लिए STOP भेजें, या Data & privacy में प्रबंधित करें।',
  },
};

async function loadKid(kidId: string): Promise<{ name: string; schoolId?: string }> {
  const snap = await adminDb.collection('kids').doc(kidId).get();
  if (!snap.exists) {
    throw new AppException('NOT_FOUND', 'Student not found.', 404);
  }
  const data = snap.data() as Record<string, unknown>;
  return {
    name: (data.name as string) ?? 'Your child',
    schoolId: data.schoolId as string | undefined,
  };
}

async function loadWeekSubmissions(
  kidId: string,
  weekStart: Date,
): Promise<{ total: number; approved: number; concepts: Set<string> }> {
  const snap = await adminDb
    .collection('submissions')
    .where('kidId', '==', kidId)
    .get();
  let total = 0;
  let approved = 0;
  const concepts = new Set<string>();
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const submittedAt =
      (data.submittedAt as { toDate?: () => Date } | undefined)?.toDate?.();
    if (!submittedAt || submittedAt < weekStart) continue;
    total += 1;
    if (data.status === 'approved') approved += 1;
    const creationId = data.creationId as string | undefined;
    if (!creationId) continue;
    const creationSnap = await adminDb.collection('creations').doc(creationId).get();
    const creation = creationSnap.data() as Record<string, unknown> | undefined;
    const list = (creation?.aiConceptsTaught as string[] | undefined) ?? [];
    for (const c of list) concepts.add(c);
  }
  return { total, approved, concepts };
}

async function loadUpcomingAssignments(
  kidId: string,
  within: number,
): Promise<Array<{ title: string; dueDate: Date }>> {
  const kidSnap = await adminDb.collection('kids').doc(kidId).get();
  const classIds = (kidSnap.data()?.classIds as string[] | undefined) ?? [];
  if (classIds.length === 0) return [];
  // Firestore `in` is capped at 30.
  const chunks: string[][] = [];
  for (let i = 0; i < classIds.length; i += 30) chunks.push(classIds.slice(i, i + 30));

  const now = Date.now();
  const horizon = now + within;
  const out: Array<{ title: string; dueDate: Date }> = [];
  for (const chunk of chunks) {
    const snap = await adminDb
      .collection('assignments')
      .where('classId', 'in', chunk)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const due = (data.dueDate as { toDate?: () => Date } | undefined)?.toDate?.();
      if (!due) continue;
      const t = due.getTime();
      if (t < now || t > horizon) continue;
      out.push({ title: (data.title as string) ?? 'Assignment', dueDate: due });
    }
  }
  return out.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 4);
}

export interface GenerateDigestInput {
  kidId: string;
  locale?: Locale;
  teacherNote?: string;
  weekStart?: Date;
}

export async function generateParentDigest(
  input: GenerateDigestInput,
): Promise<ParentDigestContent> {
  const locale: Locale = input.locale === 'hi' ? 'hi' : 'en';
  const weekStart = input.weekStart ?? startOfWeek();
  const lines: string[] = [];

  const kid = await loadKid(input.kidId);
  const [week, upcoming] = await Promise.all([
    loadWeekSubmissions(input.kidId, weekStart),
    loadUpcomingAssignments(input.kidId, 7 * 24 * 60 * 60 * 1000),
  ]);

  const t = STRINGS[locale];
  const dateLabel = weekStart.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    month: 'short',
    day: 'numeric',
  });

  lines.push(t.header(kid.name, dateLabel));
  if (week.total > 0) {
    lines.push(t.creations(week.approved, week.total));
  } else {
    lines.push(t.noCreations);
  }
  if (week.concepts.size > 0) {
    lines.push(t.concepts(Array.from(week.concepts).slice(0, 5).join(', ')));
  }
  if (upcoming.length > 0) {
    lines.push(
      t.upcoming(
        upcoming
          .map(
            (a) =>
              `${a.title} (${a.dueDate.toLocaleDateString(
                locale === 'hi' ? 'hi-IN' : 'en-IN',
                { month: 'short', day: 'numeric' },
              )})`,
          )
          .join('; '),
      ),
    );
  } else {
    lines.push(t.noUpcoming);
  }
  if (input.teacherNote) {
    lines.push(t.teacherNote(sanitizeForTelegramMarkdown(input.teacherNote.slice(0, 200))));
  }
  lines.push('');
  lines.push(t.footer);

  return {
    kidId: input.kidId,
    kidName: kid.name,
    weekStart,
    creationsThisWeek: week.total,
    approvedThisWeek: week.approved,
    conceptsThisWeek: Array.from(week.concepts),
    upcomingAssignments: upcoming,
    teacherNote: input.teacherNote,
    text: lines.join('\n'),
  };
}
