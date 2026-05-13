/**
 * Phase 4 (ADMIN-008): substitute-teacher instruction sheet.
 *
 * Drafts a 5-min recap + 20-min backup activity + classwork +
 * behavioural reminders for a single period when a teacher is absent.
 * Pulls the absent teacher's lesson plan for that day if available
 * (ADMIN-007); otherwise falls back to a chapter-only recap.
 */

import { generateJsonWithClaude } from './claudeClient';
import { buildLocaleSystemPrompt } from './localePrompts';
import { adminDb } from '@gsi/firebase/admin';
import { AppException } from '@/lib/api-utils';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export interface SubInstructionsDraft {
  recap: string;
  backupActivity: string;
  classwork: string;
  reminders: string[];
}

const SYSTEM_PROMPT = `You are a senior CBSE teacher writing instructions
for a substitute who must cover ONE period (~40 minutes) for an absent
colleague. Output STRICT JSON:

{
  "recap": string,           // 5-minute summary of the topic
  "backupActivity": string,  // 20-minute hands-on activity if recap finishes
  "classwork": string,       // assignment for students to leave behind
  "reminders": string[]      // 2-4 short behavioural / safety reminders
}

Rules:
- Use only the supplied class context — do NOT invent rosters or names.
- Stay within the listed subject and class level.
- Plain language; substitute may not be a subject specialist.
- Output strictly in the requested locale.`;

interface PeriodContext {
  subject: string;
  classGrade: string;
  className?: string;
  chapter?: string;
  recentActivity?: string;
}

async function tryLoadLessonPlanRecap(input: {
  schoolId: string;
  absentTeacherUid: string;
  classId: string;
}): Promise<{ chapter?: string; recentActivity?: string }> {
  const snap = await adminDb
    .collection('lessonPlans')
    .where('teacherUid', '==', input.absentTeacherUid)
    .where('schoolId', '==', input.schoolId)
    .get();
  if (snap.empty) return {};
  const docs = snap.docs
    .map((d) => d.data() as Record<string, unknown>)
    .map((d) => ({
      chapterName: d.chapterName as string | undefined,
      mainActivity: (d.mainActivity as { title?: string } | undefined)?.title,
      updatedAt:
        (d.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(0),
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const top = docs[0];
  return {
    chapter: top?.chapterName,
    recentActivity: top?.mainActivity,
  };
}

export interface GenerateSubInstructionsInput {
  schoolId: string;
  absentTeacherUid: string;
  classId: string;
  subject: string;
  locale?: Locale;
}

export async function generateSubInstructions(
  input: GenerateSubInstructionsInput,
): Promise<SubInstructionsDraft> {
  const locale: Locale = isSupportedLocale(input.locale) ? input.locale : 'en';

  // Pull class metadata via the schools/{id}/classes/{cid} doc — we only
  // need name and grade for the prompt context.
  const schoolsSnap = await adminDb
    .collection('schools')
    .doc(input.schoolId)
    .collection('classes')
    .doc(input.classId)
    .get();
  if (!schoolsSnap.exists) {
    throw new AppException('NOT_FOUND', 'Class not found.', 404);
  }
  const cls = schoolsSnap.data() as Record<string, unknown>;
  const ctx: PeriodContext = {
    subject: input.subject,
    classGrade: (cls.grade as string) ?? '?',
    className: (cls.name as string) ?? undefined,
  };
  const recap = await tryLoadLessonPlanRecap({
    schoolId: input.schoolId,
    absentTeacherUid: input.absentTeacherUid,
    classId: input.classId,
  });
  ctx.chapter = recap.chapter;
  ctx.recentActivity = recap.recentActivity;

  const userMessage = [
    `Locale: ${locale}`,
    `Subject: ${ctx.subject}`,
    `Class: ${ctx.classGrade}${ctx.className ? ` (${ctx.className})` : ''}`,
    ctx.chapter ? `Most-recent chapter: ${ctx.chapter}` : '',
    ctx.recentActivity ? `Most-recent activity: ${ctx.recentActivity}` : '',
    '',
    'Return JSON only.',
  ]
    .filter(Boolean)
    .join('\n');

  const draft = await generateJsonWithClaude<SubInstructionsDraft>({
    systemPrompt: buildLocaleSystemPrompt({ basePrompt: SYSTEM_PROMPT, locale }),
    userMessage,
    maxTokens: 600,
    temperature: 0.5,
  });

  return {
    recap: typeof draft.recap === 'string' ? draft.recap.trim() : '',
    backupActivity:
      typeof draft.backupActivity === 'string' ? draft.backupActivity.trim() : '',
    classwork: typeof draft.classwork === 'string' ? draft.classwork.trim() : '',
    reminders: Array.isArray(draft.reminders)
      ? draft.reminders
          .filter((r): r is string => typeof r === 'string')
          .map((r) => r.trim())
          .filter((r) => r.length > 0)
          .slice(0, 6)
      : [],
  };
}
