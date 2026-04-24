/**
 * Phase 4 (ADMIN-006): AI-Assisted Submission Feedback.
 *
 * Analyzes a submission's creation, curriculum tags, and the kid's prior
 * approved work, and drafts a 1-paragraph positive observation + 1-paragraph
 * growth area + 2-3 follow-up prompts. Teacher ALWAYS edits and approves;
 * this never auto-sends feedback to the student.
 */

import { generateJsonWithClaude } from './claudeClient';
import { buildLocaleSystemPrompt } from './localePrompts';
import { adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';
import type { SubmissionWithContext } from '@/lib/firebase/submissionService';

export type { Locale };

export interface FeedbackDraft {
  positive: string;
  growthArea: string;
  followUpPrompts: string[];
  tokensIn?: number;
  tokensOut?: number;
}

const SYSTEM_PROMPT = `You are an expert teacher coach drafting feedback on
a student's creative work in an AI-learning platform for Indian CBSE
students aged 8-17.

Constraints:
- Output strictly in the requested locale (en = English, hi = Hindi).
- Never exceed 150 words total across all three fields combined.
- Positive observation MUST reference a specific element of the creation
  (character, idea, technique) — no generic "great job" or "nice work".
- Growth area MUST be actionable and tied to a curriculum concept listed
  in context, framed as a next step not a criticism.
- Follow-up prompts: 2-3 short, open-ended questions that push the student
  to deepen a specific AI concept from their creation.
- Tone: encouraging, specific, age-appropriate.
- Do NOT fabricate details not present in the context.
- Do NOT reference any other student.`;

export interface PriorApproval {
  title: string;
  feedback?: string;
  aiConceptsTaught: string[];
  submittedAt: Date;
}

async function loadPriorApprovals(
  kidId: string,
  excludeSubmissionId: string,
): Promise<PriorApproval[]> {
  const snap = await adminDb
    .collection('submissions')
    .where('kidId', '==', kidId)
    .where('status', '==', 'approved')
    .orderBy('submittedAt', 'desc')
    .limit(6)
    .get();

  const rows: PriorApproval[] = [];
  for (const doc of snap.docs) {
    if (doc.id === excludeSubmissionId) continue;
    const data = doc.data() as Record<string, unknown>;
    const creationId = data.creationId as string | undefined;
    if (!creationId) continue;
    const creationSnap = await adminDb.collection('creations').doc(creationId).get();
    if (!creationSnap.exists) continue;
    const c = creationSnap.data() as Record<string, unknown>;
    rows.push({
      title: (c.title as string) ?? 'Untitled',
      feedback: data.feedback as string | undefined,
      aiConceptsTaught: (c.aiConceptsTaught as string[]) ?? [],
      submittedAt:
        ((data.submittedAt as { toDate?: () => Date } | undefined)?.toDate?.() ??
          new Date()),
    });
    if (rows.length >= 5) break;
  }
  return rows;
}

export interface BuildContextInput {
  submission: SubmissionWithContext;
  assignmentTitle: string;
  locale: Locale;
  priorApprovals: PriorApproval[];
}

/** Exported for the eval harness (QA-001) to test prompt assembly purity. */
export function buildUserMessage(input: BuildContextInput): string {
  const { submission, assignmentTitle, locale, priorApprovals } = input;
  const kid = submission.kid;
  const creation = submission.creation;
  const lines: string[] = [];
  lines.push(`Locale: ${locale}`);
  lines.push(`Student: ${kid.name}${kid.grade ? `, Grade ${kid.grade}` : ''}`);
  lines.push(`Assignment: ${assignmentTitle}`);
  if (creation) {
    lines.push(`Creation title: ${creation.title}`);
    lines.push(`Creation type: ${creation.type}`);
    if (creation.aiConceptsTaught.length > 0) {
      lines.push(`AI concepts covered: ${creation.aiConceptsTaught.join(', ')}`);
    }
    const contentSummary = JSON.stringify(creation.content).slice(0, 1500);
    lines.push(`Creation content summary: ${contentSummary}`);
  } else {
    lines.push(`Creation: (unavailable — draft generic feedback on assignment only)`);
  }
  if (priorApprovals.length > 0) {
    lines.push('Prior approved work (most recent first):');
    for (const p of priorApprovals.slice(0, 5)) {
      lines.push(
        `- "${p.title}" — concepts: ${p.aiConceptsTaught.join(', ') || 'none'}${
          p.feedback ? ` — teacher note: "${p.feedback.slice(0, 80)}"` : ''
        }`,
      );
    }
  }
  lines.push('');
  lines.push(
    'Return JSON: { "positive": string, "growthArea": string, "followUpPrompts": string[] }.',
  );
  return lines.join('\n');
}

export interface SuggestFeedbackInput {
  submission: SubmissionWithContext;
  assignmentTitle: string;
  locale?: Locale;
}

export async function suggestFeedback(
  input: SuggestFeedbackInput,
): Promise<FeedbackDraft> {
  const locale: Locale = isSupportedLocale(input.locale) ? input.locale : 'en';

  const priorApprovals = await loadPriorApprovals(
    input.submission.kidId,
    input.submission.id,
  );
  const userMessage = buildUserMessage({
    submission: input.submission,
    assignmentTitle: input.assignmentTitle,
    locale,
    priorApprovals,
  });

  const draft = await generateJsonWithClaude<{
    positive: string;
    growthArea: string;
    followUpPrompts: string[];
  }>({
    systemPrompt: buildLocaleSystemPrompt({ basePrompt: SYSTEM_PROMPT, locale }),
    userMessage,
    maxTokens: 400,
    temperature: 0.6,
  });

  if (
    typeof draft.positive !== 'string' ||
    typeof draft.growthArea !== 'string' ||
    !Array.isArray(draft.followUpPrompts)
  ) {
    throw new AppException(
      'AI_INVALID_RESPONSE',
      'AI returned an unexpected shape.',
      502,
    );
  }

  return {
    positive: draft.positive.trim(),
    growthArea: draft.growthArea.trim(),
    followUpPrompts: draft.followUpPrompts
      .filter((p): p is string => typeof p === 'string')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .slice(0, 3),
  };
}
