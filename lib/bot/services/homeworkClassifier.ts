/** "Is this actually homework?" classifier for forwarded messages.
 *
 *  Without this gate, `canHandleForward` returning `true` for every forward
 *  means a kid forwarding a meme, shopping list, or grocery photo gets
 *  "parsed as homework" — the LLM parser will hallucinate questions from
 *  random text. This module runs a cheap LLM call BEFORE the parser fires.
 *
 *  On `isHomework: false` the module prompts the kid to confirm or cancel
 *  instead of silently producing garbage.
 *
 *  @see /docs/MESSENGER_BOT_ARCHITECTURE.md §5 "LLM classifier before parse"
 */

import type { BotContext } from '@/lib/bot/types';

export interface HomeworkClassification {
  isHomework: boolean;
  /** 0-1 confidence from the LLM. Not authoritative — treat as a tiebreak. */
  confidence: number;
  /** One-line reason for kid-friendly display when isHomework === false. */
  reason: string;
}

const SYSTEM_PROMPT = `You are a classifier deciding if a forwarded message contains school homework.

Homework includes: math problems, reading comprehension passages with questions, lists of vocabulary words, science revision notes with questions, poems to memorise, grammar exercises, "answer these questions" lists, recitations (shlokas, multiplication tables), fill-in-the-blanks, short-answer or long-answer questions, CBSE/ICSE textbook-style questions in English or Hindi.

NOT homework: memes, jokes, shopping lists, recipe forwards, news articles, video links, WhatsApp forwards / chain messages, social-media captions, greetings, parent-to-parent conversations, personal chat.

Respond ONLY with JSON:
{
  "isHomework": boolean,
  "confidence": number (0-1),
  "reason": "one short sentence — if false, something the kid can understand like 'This looks like a shopping list.'"
}`;

/** Classify a piece of text as homework or not. Uses the bot's existing
 *  LLM pipeline (Groq → Claude fallback) via the context helper. Returns a
 *  safe default (`isHomework: true, confidence: 0.5`) when the LLM call
 *  fails — we'd rather attempt to parse than block a legitimate forward. */
export async function classifyAsHomework(
  text: string,
  context: BotContext,
): Promise<HomeworkClassification> {
  // Trim to avoid prompt-stuffing; classifier only needs a taste.
  const trimmed = text.length > 1500 ? `${text.slice(0, 1500)}...` : text;

  try {
    const raw = await context.generateText(
      `${SYSTEM_PROMPT}\n\nRespond ONLY with valid JSON. No markdown backticks, no preamble.`,
      trimmed,
    );
    const parsed = parseJson(raw);
    if (!parsed) {
      return { isHomework: true, confidence: 0.5, reason: 'classifier unavailable' };
    }
    return {
      isHomework: !!parsed.isHomework,
      confidence:
        typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.5,
      reason:
        typeof parsed.reason === 'string' && parsed.reason.trim().length > 0
          ? parsed.reason.trim()
          : parsed.isHomework
            ? 'looks like homework'
            : "doesn't look like homework",
    };
  } catch (err) {
    console.warn(
      '[homeworkClassifier] LLM call failed, defaulting to allow:',
      err instanceof Error ? err.message : err,
    );
    return { isHomework: true, confidence: 0.5, reason: 'classifier unavailable' };
  }
}

function parseJson(text: string): Partial<HomeworkClassification> | null {
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
