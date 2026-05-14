/**
 * Phase 4 (COMMS-002): one-shot ad-hoc parent message drafter.
 *
 * Teacher types one short intent (e.g. "X has been late submitting
 * homework lately"); we return a polite, specific 1-2 sentence message
 * the teacher can send via the parent's preferred channel. Always
 * human-reviewed before send.
 */

import { generateJsonWithClaude } from './claudeClient';
import { buildLocaleSystemPrompt } from './localePrompts';
import { adminDb } from '@gsi/firebase/admin';
import { AppException } from '@/lib/api-utils';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export type Tone = 'informative' | 'concerned' | 'congratulatory';

const TONES: Tone[] = ['informative', 'concerned', 'congratulatory'];

export interface AdhocMessageDraft {
  text: string;
  tone: Tone;
}

const SYSTEM_PROMPT = `You write very short messages from a teacher to a
parent about ONE specific child. Output STRICT JSON:

{ "text": string, "tone": "informative" | "concerned" | "congratulatory" }

Constraints:
- Maximum 280 characters in "text".
- Use the child's first name only — never surname or any other PII.
- Never reference any other student.
- Polite, specific, no absolute judgements ("always", "never").
- Sign off with "— [Teacher]" placeholder if a sign-off feels natural.
- "tone" must match the teacher's requested tone exactly.
- Output strictly in the requested locale.`;

function isTone(v: unknown): v is Tone {
  return typeof v === 'string' && (TONES as string[]).includes(v);
}

export interface DraftAdhocMessageInput {
  kidId: string;
  teacherIntent: string;
  tone: Tone;
  locale?: Locale;
  teacherSignoffName?: string;
}

export async function draftAdhocMessage(
  input: DraftAdhocMessageInput,
): Promise<AdhocMessageDraft> {
  const locale: Locale = isSupportedLocale(input.locale) ? input.locale : 'en';
  if (!isTone(input.tone)) {
    throw new AppException(
      'INVALID_INPUT',
      `tone must be one of: ${TONES.join(', ')}`,
      400,
    );
  }
  if (!input.teacherIntent || input.teacherIntent.trim().length < 4) {
    throw new AppException('INVALID_INPUT', 'teacherIntent is too short.', 400);
  }

  const kidSnap = await adminDb.collection('kids').doc(input.kidId).get();
  if (!kidSnap.exists) {
    throw new AppException('NOT_FOUND', 'Student not found.', 404);
  }
  const kidName = (kidSnap.data()?.name as string) ?? 'the student';
  const firstName = kidName.split(' ')[0]!;

  const userMessage = [
    `Locale: ${locale}`,
    `Child first name (use this exact name): ${firstName}`,
    `Tone requested: ${input.tone}`,
    `Teacher signoff name: ${input.teacherSignoffName ?? '[Teacher]'}`,
    `Teacher intent: ${input.teacherIntent.slice(0, 400)}`,
    '',
    'Return JSON only.',
  ].join('\n');

  const draft = await generateJsonWithClaude<AdhocMessageDraft>({
    systemPrompt: buildLocaleSystemPrompt({ basePrompt: SYSTEM_PROMPT, locale }),
    userMessage,
    maxTokens: 250,
    temperature: 0.45,
  });

  const tone: Tone = isTone(draft.tone) ? draft.tone : input.tone;
  const text = typeof draft.text === 'string' ? draft.text.trim().slice(0, 600) : '';
  if (!text) {
    throw new AppException('AI_INVALID_RESPONSE', 'AI returned an empty draft.', 502);
  }
  return { text, tone };
}
