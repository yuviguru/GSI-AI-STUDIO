/**
 * Phase 4 (COMMS-002): PTM (Parent-Teacher Meeting) prep notes.
 *
 * Per-student talking points for the teacher: progress highlights,
 * concerns / discussion items, recommended at-home practice, and
 * questions to ask the parent. Kept short (under 220 words total) so
 * it fits on one printable card.
 */

import { generateJsonWithClaude } from './claudeClient';
import { buildLocaleSystemPrompt } from './localePrompts';
import { adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export interface PtmNoteDraft {
  highlights: string;
  toDiscuss: string;
  homePractice: string;
  questionsForParent: string[];
}

const SYSTEM_PROMPT = `You are an experienced CBSE teacher preparing PTM
talking points about ONE specific student. Output STRICT JSON:

{
  "highlights": string,           // 1-2 sentences of genuine progress
  "toDiscuss": string,            // 1-2 sentences of areas to address
  "homePractice": string,         // 1-2 sentence at-home suggestion
  "questionsForParent": string[]  // 2-3 short open questions
}

Hard constraints:
- Total across all four fields: under 220 words.
- Never reference any other student.
- Use only the supplied context — do NOT invent numbers, dates, or
  events.
- Stay constructive and specific; no generic praise or scolding.
- Output strictly in the requested locale.`;

interface SubmissionRow {
  title: string;
  type: string;
  status: string;
  approvedAt?: Date;
  feedback?: string;
  concepts: string[];
}

async function loadStudentSnapshot(
  kidId: string,
  termStart: Date,
): Promise<{
  name: string;
  grade?: string;
  submissions: SubmissionRow[];
  conceptCounts: Map<string, number>;
}> {
  const kidSnap = await adminDb.collection('kids').doc(kidId).get();
  if (!kidSnap.exists) {
    throw new AppException('NOT_FOUND', 'Student not found.', 404);
  }
  const kid = kidSnap.data() as Record<string, unknown>;

  const subSnap = await adminDb
    .collection('submissions')
    .where('kidId', '==', kidId)
    .get();

  const submissions: SubmissionRow[] = [];
  const conceptCounts = new Map<string, number>();
  for (const doc of subSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const submittedAt =
      (data.submittedAt as { toDate?: () => Date } | undefined)?.toDate?.();
    if (submittedAt && submittedAt < termStart) continue;
    const creationId = data.creationId as string | undefined;
    if (!creationId) continue;
    const cSnap = await adminDb.collection('creations').doc(creationId).get();
    const c = cSnap.data() as Record<string, unknown> | undefined;
    if (!c) continue;
    const concepts = (c.aiConceptsTaught as string[]) ?? [];
    for (const cc of concepts) conceptCounts.set(cc, (conceptCounts.get(cc) ?? 0) + 1);
    submissions.push({
      title: (c.title as string) ?? 'Untitled',
      type: (c.type as string) ?? 'creation',
      status: (data.status as string) ?? 'pending',
      approvedAt:
        data.status === 'approved'
          ? (data.reviewedAt as { toDate?: () => Date } | undefined)?.toDate?.()
          : undefined,
      feedback: data.feedback as string | undefined,
      concepts,
    });
  }

  return {
    name: (kid.name as string) ?? 'Student',
    grade: kid.grade as string | undefined,
    submissions,
    conceptCounts,
  };
}

function buildUserMessage(input: {
  name: string;
  grade?: string;
  term: string;
  locale: Locale;
  submissions: SubmissionRow[];
  conceptCounts: Map<string, number>;
}): string {
  const { name, grade, term, locale, submissions, conceptCounts } = input;
  const approved = submissions.filter((s) => s.status === 'approved').length;
  const revisions = submissions.filter((s) => s.status === 'revision_requested').length;
  const topConcepts = Array.from(conceptCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([c, n]) => `${c} (×${n})`)
    .join(', ');

  const samples = submissions
    .slice(0, 6)
    .map(
      (s) =>
        `- "${s.title}" [${s.type}] · status=${s.status}${s.feedback ? ` · teacher: "${s.feedback.slice(0, 80)}"` : ''}`,
    )
    .join('\n');

  return [
    `Locale: ${locale}`,
    `Student: ${name}${grade ? `, Grade ${grade}` : ''}`,
    `Term: ${term}`,
    `Submissions: ${submissions.length} total, ${approved} approved, ${revisions} revision-requested`,
    `Concepts covered most: ${topConcepts || 'none recorded yet'}`,
    '',
    'Recent submissions:',
    samples || '(none in this term)',
    '',
    'Return JSON only.',
  ].join('\n');
}

export interface GeneratePtmNoteInput {
  kidId: string;
  term: string;
  termStart: string;
  locale?: Locale;
}

export async function generatePtmNote(input: GeneratePtmNoteInput): Promise<PtmNoteDraft> {
  const locale: Locale = isSupportedLocale(input.locale) ? input.locale : 'en';
  const termStart = new Date(input.termStart);
  if (Number.isNaN(termStart.getTime())) {
    throw new AppException('INVALID_INPUT', 'termStart must be an ISO date.', 400);
  }
  const ctx = await loadStudentSnapshot(input.kidId, termStart);
  const userMessage = buildUserMessage({
    name: ctx.name,
    grade: ctx.grade,
    term: input.term,
    locale,
    submissions: ctx.submissions,
    conceptCounts: ctx.conceptCounts,
  });

  const draft = await generateJsonWithClaude<PtmNoteDraft>({
    systemPrompt: buildLocaleSystemPrompt({ basePrompt: SYSTEM_PROMPT, locale }),
    userMessage,
    maxTokens: 700,
    temperature: 0.55,
  });

  return {
    highlights: typeof draft.highlights === 'string' ? draft.highlights.trim() : '',
    toDiscuss: typeof draft.toDiscuss === 'string' ? draft.toDiscuss.trim() : '',
    homePractice: typeof draft.homePractice === 'string' ? draft.homePractice.trim() : '',
    questionsForParent: Array.isArray(draft.questionsForParent)
      ? draft.questionsForParent
          .filter((q): q is string => typeof q === 'string')
          .map((q) => q.trim())
          .filter((q) => q.length > 0)
          .slice(0, 4)
      : [],
  };
}
