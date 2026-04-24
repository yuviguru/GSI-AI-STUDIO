/**
 * Phase 4 (ADMIN-005): CBSE blueprint-aware question paper generator.
 *
 * Teacher picks subject × class × chapters + a blueprint (Bloom's
 * distribution, difficulty mix, question-type counts). Claude returns
 * sections of questions with marking scheme. Strict JSON; defensive
 * coercion on every output field. NCERT chapter outcomes anchor the
 * questions so nothing drifts outside scope.
 */

import { generateJsonWithClaude } from './claudeClient';
import { buildLocaleSystemPrompt } from './localePrompts';
import { AppException } from '@/lib/api-utils';
import { getChapter, type ChapterEntry } from '@/lib/curriculum/ncertIndex';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export type BloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionType = 'mcq' | 'short' | 'long' | 'application' | 'case-study';

export interface QuestionTypeSpec {
  type: QuestionType;
  count: number;
  marksEach: number;
}

export interface BloomDistribution {
  remember?: number;
  understand?: number;
  apply?: number;
  analyze?: number;
  evaluate?: number;
  create?: number;
}

export interface DifficultyMix {
  easy?: number;
  medium?: number;
  hard?: number;
}

export interface PaperBlueprint {
  bloomsDistribution: BloomDistribution;
  difficultyMix: DifficultyMix;
  questionTypes: QuestionTypeSpec[];
}

export interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  text: string;
  marks: number;
  bloom: BloomLevel;
  difficulty: Difficulty;
  answerKey: string;
  chapterId?: string;
}

export interface PaperSection {
  title: string;
  instructions?: string;
  questions: GeneratedQuestion[];
}

export interface QuestionPaperDraft {
  sections: PaperSection[];
  computedTotalMarks: number;
  bloomsActualPct: BloomDistribution;
}

const BLOOM_LEVELS: BloomLevel[] = [
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
];
const DIFFICULTY_LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const QUESTION_TYPES: QuestionType[] = ['mcq', 'short', 'long', 'application', 'case-study'];

const SYSTEM_PROMPT = `You are a senior CBSE subject teacher writing a fair,
exam-ready question paper. Output STRICT JSON matching:

{
  "sections": [
    {
      "title": string,
      "instructions": string,
      "questions": [
        {
          "id": string,
          "type": "mcq" | "short" | "long" | "application" | "case-study",
          "text": string,
          "marks": number,
          "bloom": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create",
          "difficulty": "easy" | "medium" | "hard",
          "answerKey": string,
          "chapterId": string
        }
      ]
    }
  ]
}

Rules:
- Stay strictly within the supplied chapters' learning outcomes.
- Match the requested counts per question type EXACTLY.
- Approximate the requested Bloom's distribution within ±10 percentage
  points (calculated by total marks weight, not question count).
- Approximate the difficulty mix within ±10 points (same basis).
- Every question must have a non-empty answerKey suitable for a marker.
- chapterId must be one of the supplied chapter IDs.
- mcq questions phrase the four options inside "text" as
  "(a) … (b) … (c) … (d) …". answerKey is the letter only.
- Number question IDs Q1, Q2, Q3, ... across the whole paper.`;

function buildUserMessage(input: {
  subject: string;
  classGrade: string;
  chapters: ChapterEntry[];
  blueprint: PaperBlueprint;
  totalMarks: number;
  durationMinutes: number;
  locale: Locale;
}): string {
  const { subject, classGrade, chapters, blueprint, totalMarks, durationMinutes, locale } = input;
  const chapterLines = chapters.flatMap((c) => [
    `Chapter ${c.chapterNumber}: ${c.chapterName} [id=${c.id}]`,
    ...c.learningOutcomes.map((o) => `  - ${o}`),
  ]);

  const types = blueprint.questionTypes
    .map((t) => `- ${t.count} × ${t.type} @ ${t.marksEach} marks each`)
    .join('\n');

  const bloomsLines = Object.entries(blueprint.bloomsDistribution)
    .filter(([, pct]) => typeof pct === 'number')
    .map(([level, pct]) => `- ${level}: ${pct}%`)
    .join('\n');

  const diffLines = Object.entries(blueprint.difficultyMix)
    .filter(([, pct]) => typeof pct === 'number')
    .map(([level, pct]) => `- ${level}: ${pct}%`)
    .join('\n');

  return [
    `Locale: ${locale}`,
    `Subject: ${subject}`,
    `Class: ${classGrade}`,
    `Total marks: ${totalMarks}`,
    `Duration: ${durationMinutes} minutes`,
    '',
    'Chapters in scope (with learning outcomes):',
    ...chapterLines,
    '',
    'Question types & counts:',
    types,
    '',
    'Bloom\'s distribution (target % of marks):',
    bloomsLines || '(no preference)',
    '',
    'Difficulty mix (target % of marks):',
    diffLines || '(no preference)',
    '',
    'Group questions into sections by type. Provide section instructions.',
    'Return JSON only.',
  ].join('\n');
}

function isType(v: unknown): v is QuestionType {
  return typeof v === 'string' && (QUESTION_TYPES as string[]).includes(v);
}
function isBloom(v: unknown): v is BloomLevel {
  return typeof v === 'string' && (BLOOM_LEVELS as string[]).includes(v);
}
function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && (DIFFICULTY_LEVELS as string[]).includes(v);
}

function safeQuestion(raw: Record<string, unknown>, idx: number): GeneratedQuestion {
  const id =
    typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : `Q${idx + 1}`;
  const type = isType(raw.type) ? raw.type : 'short';
  const bloom = isBloom(raw.bloom) ? raw.bloom : 'understand';
  const difficulty = isDifficulty(raw.difficulty) ? raw.difficulty : 'medium';
  return {
    id,
    type,
    text: typeof raw.text === 'string' ? raw.text : '',
    marks: typeof raw.marks === 'number' ? raw.marks : 1,
    bloom,
    difficulty,
    answerKey: typeof raw.answerKey === 'string' ? raw.answerKey : '',
    chapterId: typeof raw.chapterId === 'string' ? raw.chapterId : undefined,
  };
}

function computeBloomsActualPct(sections: PaperSection[]): BloomDistribution {
  const totals: Record<BloomLevel, number> = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0,
  };
  let totalMarks = 0;
  for (const s of sections) {
    for (const q of s.questions) {
      totals[q.bloom] += q.marks;
      totalMarks += q.marks;
    }
  }
  const pct: BloomDistribution = {};
  if (totalMarks > 0) {
    for (const level of BLOOM_LEVELS) {
      pct[level] = Math.round((totals[level] / totalMarks) * 100);
    }
  }
  return pct;
}

export interface GenerateQuestionPaperInput {
  subject: string;
  classGrade: string;
  chapterIds: string[];
  blueprint: PaperBlueprint;
  totalMarks: number;
  durationMinutes: number;
  locale?: Locale;
}

export interface GenerateQuestionPaperResult {
  draft: QuestionPaperDraft;
  chapters: ChapterEntry[];
}

export async function generateQuestionPaper(
  input: GenerateQuestionPaperInput,
): Promise<GenerateQuestionPaperResult> {
  if (input.chapterIds.length === 0) {
    throw new AppException('INVALID_INPUT', 'At least one chapterId is required.', 400);
  }
  if (input.blueprint.questionTypes.length === 0) {
    throw new AppException('INVALID_INPUT', 'At least one question type is required.', 400);
  }
  const locale: Locale = isSupportedLocale(input.locale) ? input.locale : 'en';

  const chapters: ChapterEntry[] = [];
  for (const id of input.chapterIds) {
    const c = getChapter(id);
    if (!c) {
      throw new AppException('NOT_FOUND', `Chapter "${id}" not in NCERT index.`, 404);
    }
    chapters.push(c);
  }
  // All chapters must share subject + class — paper is single-subject.
  const subject = chapters[0]!.subject;
  const classGrade = chapters[0]!.class;
  for (const c of chapters) {
    if (c.subject !== subject || c.class !== classGrade) {
      throw new AppException(
        'INVALID_INPUT',
        'All chapters must share the same subject and class.',
        400,
      );
    }
  }

  const userMessage = buildUserMessage({
    subject: input.subject || subject,
    classGrade: input.classGrade || classGrade,
    chapters,
    blueprint: input.blueprint,
    totalMarks: input.totalMarks,
    durationMinutes: input.durationMinutes,
    locale,
  });

  const raw = await generateJsonWithClaude<{
    sections: Array<{
      title: string;
      instructions?: string;
      questions: Record<string, unknown>[];
    }>;
  }>({
    systemPrompt: buildLocaleSystemPrompt({ basePrompt: SYSTEM_PROMPT, locale }),
    userMessage,
    maxTokens: 4000,
    temperature: 0.45,
  });

  const sections: PaperSection[] = (raw.sections ?? []).map((s) => ({
    title: typeof s.title === 'string' ? s.title : 'Section',
    instructions: typeof s.instructions === 'string' ? s.instructions : undefined,
    questions: Array.isArray(s.questions)
      ? s.questions.map((q, i) => safeQuestion(q, i))
      : [],
  }));

  const draft: QuestionPaperDraft = {
    sections,
    computedTotalMarks: sections.reduce(
      (a, s) => a + s.questions.reduce((b, q) => b + q.marks, 0),
      0,
    ),
    bloomsActualPct: computeBloomsActualPct(sections),
  };

  return { draft, chapters };
}
