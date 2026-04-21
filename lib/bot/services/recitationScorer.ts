/** Recitation scoring — compares a Whisper STT transcript against the
 *  expected `recitationText` from a HomeworkQuestion.
 *
 *  The original design (§5 of MESSENGER_BOT_ARCHITECTURE.md) used an LLM to
 *  produce the numeric accuracy score. That invites hallucination and
 *  inconsistency. v1 splits the job:
 *
 *    - **numeric accuracy** = word-level alignment (1 − WER) computed
 *      deterministically from the two strings
 *    - **encouragement + one concrete tip** = LLM, which is where warmth
 *      and concrete pronunciation feedback actually belong
 *
 *  @see /docs/MESSENGER_BOT_ARCHITECTURE.md §5 "WER + LLM encouragement" */

import type { BotContext } from '@/lib/bot/types';

export interface RecitationScore {
  /** 0-100 integer accuracy percentage. */
  accuracy: number;
  /** Warm, kid-friendly 1-2 sentence encouragement. */
  encouragement: string;
  /** A single concrete, actionable pronunciation tip. */
  tip: string;
  /** Short, comma-separated list of words the kid struggled with; empty
   *  when accuracy is high or STT did not surface clear mismatches. */
  pronunciationNotes: string;
}

/** Normalise a string for WER comparison — lowercase, strip punctuation,
 *  collapse whitespace. Language-agnostic; works fine for Devanagari too
 *  since punctuation-stripping is Unicode-safe. */
function normalise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/** Compute word error rate (WER) between expected and actual using
 *  standard Levenshtein edit distance at the word level. Returns a number
 *  in [0, 1]. Exported for unit testing. */
export function wordErrorRate(expected: string, actual: string): number {
  const exp = normalise(expected);
  const act = normalise(actual);
  if (exp.length === 0) return act.length === 0 ? 0 : 1;

  // Dynamic programming on the word sequences — classic edit distance.
  // Pre-allocate a dense 2D matrix so TypeScript sees every index as a
  // guaranteed `number` under `noUncheckedIndexedAccess`.
  const rows = exp.length + 1;
  const cols = act.length + 1;
  const dp = new Array<number[]>(rows);
  for (let i = 0; i < rows; i += 1) {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    dp[i] = row;
  }
  const firstRow = dp[0]!;
  for (let j = 0; j < cols; j += 1) firstRow[j] = j;

  for (let i = 1; i < rows; i += 1) {
    const current = dp[i]!;
    const prev = dp[i - 1]!;
    for (let j = 1; j < cols; j += 1) {
      if (exp[i - 1] === act[j - 1]) {
        current[j] = prev[j - 1]!;
      } else {
        current[j] = 1 + Math.min(prev[j]!, current[j - 1]!, prev[j - 1]!);
      }
    }
  }
  return dp[rows - 1]![cols - 1]! / exp.length;
}

/** Convert WER to a 0-100 accuracy integer. WER is capped at 1 so the
 *  floor is always 0. */
export function accuracyFromWer(wer: number): number {
  const clamped = Math.max(0, Math.min(1, wer));
  return Math.round((1 - clamped) * 100);
}

const ENCOURAGEMENT_SYSTEM_PROMPT = `You are writing feedback for an Indian school child (ages 8-17) who just read a short passage aloud for homework practice.

You will be given:
- The expected text
- What the child said (STT transcript — may have small errors)
- The numeric accuracy score (0-100)

Respond with warm, kid-friendly encouragement. Never say "wrong" or "failed". Celebrate effort first, give ONE concrete tip second. Keep each field to a single short sentence.

Return ONLY JSON:
{
  "encouragement": "string",
  "tip": "string",
  "pronunciationNotes": "short comma-separated list of tricky words, or '' when accuracy is very high"
}`;

/** Score a recitation end-to-end: WER for the numeric accuracy, LLM for
 *  warmth + tip. The LLM never sees the score's units — it only gets a
 *  number to react to, which keeps the numeric output deterministic. */
export async function scoreRecitation(params: {
  expected: string;
  transcript: string;
  context: BotContext;
}): Promise<RecitationScore> {
  const { expected, transcript, context } = params;
  const wer = wordErrorRate(expected, transcript);
  const accuracy = accuracyFromWer(wer);

  const userPrompt = [
    `Expected: "${expected}"`,
    `Child said: "${transcript}"`,
    `Accuracy score: ${accuracy}`,
  ].join('\n');

  let encouragement = defaultEncouragement(accuracy);
  let tip = 'Try reading a little slower and clearer next time.';
  let pronunciationNotes = '';

  try {
    const raw = await context.generateText(
      `${ENCOURAGEMENT_SYSTEM_PROMPT}\n\nRespond ONLY with valid JSON. No markdown backticks, no preamble.`,
      userPrompt,
    );
    const parsed = parseJson(raw);
    if (parsed) {
      if (typeof parsed.encouragement === 'string' && parsed.encouragement.trim()) {
        encouragement = parsed.encouragement.trim();
      }
      if (typeof parsed.tip === 'string' && parsed.tip.trim()) {
        tip = parsed.tip.trim();
      }
      if (typeof parsed.pronunciationNotes === 'string') {
        pronunciationNotes = parsed.pronunciationNotes.trim();
      }
    }
  } catch (err) {
    // Fall back to a canned encouragement; numeric accuracy is still real.
    console.warn(
      '[recitationScorer] LLM feedback unavailable, using fallback:',
      err instanceof Error ? err.message : err,
    );
  }

  return { accuracy, encouragement, tip, pronunciationNotes };
}

function defaultEncouragement(accuracy: number): string {
  if (accuracy >= 90) return 'Wow, that was so clear! Great reading.';
  if (accuracy >= 70) return 'Really good effort — you are getting there!';
  if (accuracy >= 50) return 'Nice try! Reading aloud is brave.';
  return 'Everyone starts somewhere — great that you are practising!';
}

function parseJson(text: string): Partial<RecitationScore> | null {
  try {
    return JSON.parse(text.trim());
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}
