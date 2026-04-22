/**
 * Phase 4 (ADMIN-004): NEP Holistic Progress Card narrative drafting.
 *
 * Assembles per-student context from our own data (submissions +
 * curriculum concepts covered) plus the teacher's quick-tags and asks
 * Claude for a 3-paragraph narrative (cognitive, affective, psychomotor)
 * plus a next-term focus suggestion. Teacher always edits before publish.
 *
 * The biggest Phase 4 differentiator — no Indian competitor currently
 * owns the HPC narrative workflow well.
 */

import { generateJsonWithClaude } from './claudeClient';
import { adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';

export type Locale = 'en' | 'hi';

export interface HpcNarrativeDraft {
  cognitive: string;
  affective: string;
  psychomotor: string;
  nextTermFocus: string;
}

const SYSTEM_PROMPT = `You are an expert CBSE / NEP 2020 teacher drafting the
qualitative narrative portion of a Holistic Progress Card (HPC) for a
student aged 8-17.

Required output shape — return STRICT JSON:
{
  "cognitive":      string,  // observations about knowledge, reasoning, creativity
  "affective":      string,  // observations about attitude, collaboration, emotion
  "psychomotor":    string,  // observations about effort, craft, persistence
  "nextTermFocus":  string   // a short next-term recommendation (2-3 sentences)
}

Each domain paragraph MUST be 3-5 sentences, grounded in the concrete
signals in the context (submissions, concepts, teacher tags). Never
invent details not in context.

Voice:
- Warm, specific, professional. Avoids generic praise.
- Written for a parent who is not a subject expert.
- Output strictly in the requested locale (en = English, hi = Hindi).
- For hi: use Devanagari script. Keep CBSE / NEP pedagogy terminology
  consistent with the glossary (cognitive → संज्ञानात्मक, affective →
  भावात्मक, psychomotor → मनोपेशीय, holistic → समग्र).
- Do NOT reference any other student.
- Do NOT promise grades, ranks, or fixed outcomes.
- Do NOT exceed ~160 words across all 4 fields combined.`;

interface SubmissionSummary {
  title: string;
  creationType: string;
  concepts: string[];
  approvedAt?: Date;
  teacherFeedback?: string;
  revisionRequested: boolean;
}

async function loadStudentTermContext(
  kidId: string,
  termStart: Date,
): Promise<{
  name: string;
  grade?: string;
  submissions: SubmissionSummary[];
  conceptCounts: Map<string, number>;
}> {
  const kidSnap = await adminDb.collection('kids').doc(kidId).get();
  if (!kidSnap.exists) {
    throw new AppException('NOT_FOUND', 'Student not found.', 404);
  }
  const kid = kidSnap.data() as Record<string, unknown>;
  const name = (kid.name as string) ?? 'Student';
  const grade = kid.grade as string | undefined;

  const submissionsSnap = await adminDb
    .collection('submissions')
    .where('kidId', '==', kidId)
    .get();

  const submissions: SubmissionSummary[] = [];
  const conceptCounts = new Map<string, number>();

  for (const doc of submissionsSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const submittedAt =
      (data.submittedAt as { toDate?: () => Date } | undefined)?.toDate?.();
    if (submittedAt && submittedAt < termStart) continue;
    const status = data.status as string;
    const creationId = data.creationId as string | undefined;
    if (!creationId) continue;

    const creationSnap = await adminDb.collection('creations').doc(creationId).get();
    if (!creationSnap.exists) continue;
    const c = creationSnap.data() as Record<string, unknown>;
    const concepts = (c.aiConceptsTaught as string[] | undefined) ?? [];
    for (const concept of concepts) {
      conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + 1);
    }

    submissions.push({
      title: (c.title as string) ?? 'Untitled',
      creationType: (c.type as string) ?? 'story',
      concepts,
      approvedAt:
        status === 'approved'
          ? (data.reviewedAt as { toDate?: () => Date } | undefined)?.toDate?.()
          : undefined,
      teacherFeedback: data.feedback as string | undefined,
      revisionRequested: status === 'revision_requested',
    });
  }

  return { name, grade, submissions, conceptCounts };
}

function buildUserMessage(input: {
  name: string;
  grade?: string;
  term: string;
  locale: Locale;
  teacherTags: string[];
  submissions: SubmissionSummary[];
  conceptCounts: Map<string, number>;
}): string {
  const {
    name,
    grade,
    term,
    locale,
    teacherTags,
    submissions,
    conceptCounts,
  } = input;

  const topConcepts = Array.from(conceptCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c, n]) => `${c} (×${n})`)
    .join(', ');

  const approved = submissions.filter((s) => s.approvedAt).length;
  const revisions = submissions.filter((s) => s.revisionRequested).length;

  const samples = submissions
    .slice(0, 8)
    .map(
      (s) =>
        `- "${s.title}" [${s.creationType}] — concepts: ${
          s.concepts.join(', ') || 'none'
        }${s.teacherFeedback ? ` — teacher: "${s.teacherFeedback.slice(0, 90)}"` : ''}`,
    )
    .join('\n');

  return [
    `Locale: ${locale}`,
    `Student: ${name}${grade ? `, Grade ${grade}` : ''}`,
    `Term: ${term}`,
    `Teacher quick-tags: ${teacherTags.length > 0 ? teacherTags.join(', ') : 'none'}`,
    `Submission totals: ${submissions.length} total, ${approved} approved, ${revisions} revision-requested`,
    `Concepts covered most: ${topConcepts || 'none recorded'}`,
    '',
    'Recent submissions:',
    samples || '(none in this term)',
    '',
    'Draft the HPC JSON strictly in the requested locale.',
  ].join('\n');
}

export interface GenerateHpcInput {
  kidId: string;
  term: string;
  /** ISO date string for term start. */
  termStart: string;
  locale: Locale;
  teacherTags: string[];
}

export async function generateHpcNarrative(
  input: GenerateHpcInput,
): Promise<HpcNarrativeDraft & { contextSignals: { submissionCount: number; conceptsCovered: number } }> {
  if (input.locale !== 'en' && input.locale !== 'hi') {
    throw new AppException('INVALID_INPUT', 'locale must be "en" or "hi".', 400);
  }
  const termStart = new Date(input.termStart);
  if (Number.isNaN(termStart.getTime())) {
    throw new AppException('INVALID_INPUT', 'termStart must be an ISO date.', 400);
  }

  const context = await loadStudentTermContext(input.kidId, termStart);
  const userMessage = buildUserMessage({
    name: context.name,
    grade: context.grade,
    term: input.term,
    locale: input.locale,
    teacherTags: input.teacherTags,
    submissions: context.submissions,
    conceptCounts: context.conceptCounts,
  });

  const draft = await generateJsonWithClaude<HpcNarrativeDraft>({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 900,
    temperature: 0.55,
  });

  if (
    typeof draft.cognitive !== 'string' ||
    typeof draft.affective !== 'string' ||
    typeof draft.psychomotor !== 'string' ||
    typeof draft.nextTermFocus !== 'string'
  ) {
    throw new AppException(
      'AI_INVALID_RESPONSE',
      'AI returned an unexpected HPC shape.',
      502,
    );
  }

  return {
    cognitive: draft.cognitive.trim(),
    affective: draft.affective.trim(),
    psychomotor: draft.psychomotor.trim(),
    nextTermFocus: draft.nextTermFocus.trim(),
    contextSignals: {
      submissionCount: context.submissions.length,
      conceptsCovered: context.conceptCounts.size,
    },
  };
}
