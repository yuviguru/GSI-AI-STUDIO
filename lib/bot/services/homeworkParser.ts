/** LLM-powered parser that converts raw homework text into a structured
 *  HomeworkSession payload (subject, grade estimate, questions[]). Runs
 *  after OCR/STT + `filterInput()` + the "is this homework?" classifier.
 *
 *  Uses the bot's shared LLM pipeline (Groq → Claude fallback) via the
 *  `BotContext` helper so prompt-caching + safety filtering stay consistent
 *  with the rest of the bot.
 *
 *  @see /docs/MESSENGER_BOT_ARCHITECTURE.md §5 (module template) */

import type {
  BotContext,
  HomeworkLanguage,
  HomeworkMode,
  HomeworkQuestion,
} from '@/lib/bot/types';

export interface ParsedHomework {
  subject: string;
  gradeEstimate: number;
  totalQuestions: number;
  language: HomeworkLanguage;
  questions: HomeworkQuestion[];
  /** Smart default mode recommended for this homework — picked from the
   *  mix of question types. Kids can still change mode via `hw_mode:`. */
  suggestedMode: HomeworkMode;
}

/** Extract up to this many questions per forward. Larger homeworks are
 *  clipped so no single session balloons into an unbounded Firestore doc
 *  or an unending quiz loop. */
const MAX_QUESTIONS = 12;

const SYSTEM_PROMPT = `You are a homework parser for Indian school children (ages 8-17, CBSE/ICSE).

Given homework text (possibly noisy OCR output), extract:
1. Subject — one of: Math, Science, English, Hindi, Social Studies, General Knowledge, Computer Science. Use "General" if unclear.
2. Grade level estimate — integer 1-12. Guess low when unclear.
3. Questions — split the homework into individual, self-contained questions. Fix obvious OCR typos. Skip section headers and instructions that aren't questions. Cap at ${MAX_QUESTIONS} questions; if more exist, pick the first ${MAX_QUESTIONS}.

For each question, infer:
- "type": "multiple_choice" | "short_answer" | "recitation" | "explanation" | "calculation"
- "options": array of 2-4 choices (only for multiple_choice, else null)
- "correctAnswer": the correct answer when determinable (string; null for open-ended explanation questions)
- "hint": a short, kid-friendly nudge (1 sentence)
- "recitationText": the exact text to read aloud (only for recitation-type — shlokas, poems, tables; else null)
- "similarPractice": one analogous practice problem the child can try after this one (string; null when not meaningful)
- "meta.steps" (optional): for multi-step math problems, an array of up to 3 { prompt, expected } stepping stones. Omit meta entirely for simple/non-math questions.

Suggested mode: "quiz" for mostly multiple_choice/short_answer/calculation; "recite" when a recitation block exists; "explain" when most questions are explanation; "practice" when similarPractice is the focus.

Language: detect whether the questions are in "en" (English) or "hi" (Hindi / Devanagari). Single value, best effort.

Respond ONLY with JSON, no markdown fences:
{
  "subject": "string",
  "gradeEstimate": number,
  "language": "en" | "hi",
  "suggestedMode": "quiz" | "recite" | "explain" | "practice",
  "totalQuestions": number,
  "questions": [
    {
      "id": 1,
      "text": "...",
      "type": "multiple_choice | short_answer | recitation | explanation | calculation",
      "options": ["a", "b"] | null,
      "correctAnswer": "string" | null,
      "hint": "string",
      "recitationText": "string" | null,
      "similarPractice": "string" | null,
      "meta": { "steps": [{ "prompt": "...", "expected": "..." }] } | null
    }
  ]
}

If no questions can be extracted, return totalQuestions: 0 and an empty questions array — DO NOT invent questions.`;

/** Call the LLM parser and return a validated `ParsedHomework` or null
 *  when the parse failed or extracted zero questions. */
export async function parseHomework(
  rawText: string,
  context: BotContext,
): Promise<ParsedHomework | null> {
  // Clip obscenely long inputs so we don't blow the context window; parser
  // only needs the first ~6k chars of a forward in the worst case.
  const input = rawText.length > 6000 ? `${rawText.slice(0, 6000)}...` : rawText;

  let raw: string;
  try {
    raw = await context.generateText(SYSTEM_PROMPT, input);
  } catch (err) {
    console.warn(
      '[homeworkParser] LLM call failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  const parsed = parseJson(raw);
  if (!parsed) return null;

  const questions = sanitiseQuestions(parsed.questions);
  if (questions.length === 0) return null;

  const language: HomeworkLanguage = parsed.language === 'hi' ? 'hi' : 'en';
  const suggestedMode = pickMode(parsed.suggestedMode, questions);

  return {
    subject: typeof parsed.subject === 'string' ? parsed.subject : 'General',
    gradeEstimate:
      typeof parsed.gradeEstimate === 'number' ? clampGrade(parsed.gradeEstimate) : 5,
    totalQuestions: questions.length,
    language,
    questions,
    suggestedMode,
  };
}

// ─── Helpers ───────────────────────────────────────────────

interface LlmPayload {
  subject?: unknown;
  gradeEstimate?: unknown;
  language?: unknown;
  suggestedMode?: unknown;
  totalQuestions?: unknown;
  questions?: unknown;
}

function parseJson(text: string): LlmPayload | null {
  try {
    return JSON.parse(text.trim()) as LlmPayload;
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1].trim()) as LlmPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clampGrade(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(12, Math.round(n)));
}

function pickMode(hint: unknown, questions: HomeworkQuestion[]): HomeworkMode {
  const allowed: HomeworkMode[] = ['quiz', 'recite', 'explain', 'practice'];
  if (typeof hint === 'string' && (allowed as string[]).includes(hint)) {
    return hint as HomeworkMode;
  }
  // Heuristic fallback by majority question type.
  const hasRecitation = questions.some((q) => q.type === 'recitation');
  if (hasRecitation) return 'recite';
  const explanations = questions.filter((q) => q.type === 'explanation').length;
  if (explanations > questions.length / 2) return 'explain';
  return 'quiz';
}

function sanitiseQuestions(raw: unknown): HomeworkQuestion[] {
  if (!Array.isArray(raw)) return [];
  const allowedTypes = new Set([
    'multiple_choice',
    'short_answer',
    'recitation',
    'explanation',
    'calculation',
  ]);
  const out: HomeworkQuestion[] = [];
  raw.slice(0, MAX_QUESTIONS).forEach((q, index) => {
    if (!q || typeof q !== 'object') return;
    const obj = q as Record<string, unknown>;
    const text = typeof obj.text === 'string' ? obj.text.trim() : '';
    if (!text) return;
    const type = allowedTypes.has(String(obj.type))
      ? (obj.type as HomeworkQuestion['type'])
      : 'short_answer';

    const optionsRaw = Array.isArray(obj.options) ? obj.options : null;
    const options =
      type === 'multiple_choice' && optionsRaw
        ? optionsRaw
            .filter((o): o is string => typeof o === 'string')
            .slice(0, 4)
        : null;

    const question: HomeworkQuestion = {
      id: index + 1,
      text,
      type,
      options: options && options.length > 0 ? options : null,
      correctAnswer: typeof obj.correctAnswer === 'string' ? obj.correctAnswer : null,
      hint:
        typeof obj.hint === 'string' && obj.hint.trim()
          ? obj.hint.trim()
          : 'Take your time — you can do this!',
      recitationText:
        type === 'recitation' && typeof obj.recitationText === 'string'
          ? obj.recitationText.trim()
          : null,
      similarPractice:
        typeof obj.similarPractice === 'string' ? obj.similarPractice.trim() : null,
    };

    const meta = obj.meta as { steps?: unknown } | undefined;
    if (meta && Array.isArray(meta.steps)) {
      const steps = meta.steps
        .map((s) => s as { prompt?: unknown; expected?: unknown })
        .filter(
          (s): s is { prompt: string; expected: string } =>
            typeof s.prompt === 'string' && typeof s.expected === 'string',
        )
        .slice(0, 3);
      if (steps.length > 0) {
        question.meta = { steps };
      }
    }

    out.push(question);
  });
  return out;
}
