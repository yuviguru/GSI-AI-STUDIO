/**
 * Phase 4 (ADMIN-007): CBSE-mapped lesson plan generator.
 *
 * Teacher picks subject × class × chapter × duration; Claude returns a
 * structured plan that's ready to print AND ready to convert into an
 * assignment via the existing assignment endpoint. NCERT learning
 * outcomes are passed in as context so Claude doesn't invent them.
 */

import { generateJsonWithClaude } from './claudeClient';
import { buildLocaleSystemPrompt } from './localePrompts';
import { AppException } from '@/lib/api-utils';
import {
  getChapter,
  type ChapterEntry,
  type Subject,
} from '@/lib/curriculum/ncertIndex';
import { isSupportedLocale, type Locale } from '@/lib/i18n/locales';

export type StudioId = 'story' | 'music' | 'quiz' | 'game' | 'comic';

const STUDIO_IDS: StudioId[] = ['story', 'music', 'quiz', 'game', 'comic'];

export interface LessonPlanDraft {
  learningOutcomes: string[];
  hookActivity: string;
  mainActivity: {
    title: string;
    description: string;
    linkedStudio: StudioId | null;
  };
  closure: string;
  assessment: { type: string; sample: string };
  differentiation: { lower: string; higher: string };
  materials: string[];
}

const SYSTEM_PROMPT = `You are an experienced CBSE teacher drafting a single
lesson plan for an Indian classroom (grades 3-12). Output STRICT JSON
matching this shape:

{
  "learningOutcomes": string[],   // 3-5 outcomes; start each with a Bloom's verb
  "hookActivity": string,         // 5-min opener, concrete and time-boxed
  "mainActivity": {
    "title": string,
    "description": string,
    "linkedStudio": "story" | "music" | "quiz" | "game" | "comic" | null
  },
  "closure": string,              // 3-5 min wrap, includes a 1-question check
  "assessment": { "type": string, "sample": string },
  "differentiation": { "lower": string, "higher": string },
  "materials": string[]           // 3-8 short items
}

Rules:
- Stay strictly within the requested NCERT chapter — never reference
  topics from outside it.
- Every learningOutcome must be derivable from the supplied chapter
  outcomes; do not invent new ones.
- Pick linkedStudio only when the main activity genuinely fits a
  GSI creation studio (story/music/quiz/game/comic). Otherwise null.
- Total minutes across hook + main + closure should fit the requested
  duration ±5 minutes.
- Plain language for new teachers; no jargon-only sentences.`;

function clamp<T>(arr: T[], max: number): T[] {
  return arr.length > max ? arr.slice(0, max) : arr;
}

function toStudio(value: unknown): StudioId | null {
  return typeof value === 'string' && (STUDIO_IDS as string[]).includes(value)
    ? (value as StudioId)
    : null;
}

function buildUserMessage(input: {
  chapter: ChapterEntry;
  durationMinutes: number;
  studioPreference?: StudioId;
  locale: Locale;
}): string {
  const { chapter, durationMinutes, studioPreference, locale } = input;
  const lines = [
    `Locale: ${locale}`,
    `Subject: ${chapter.subject}`,
    `Class: ${chapter.class}`,
    `Chapter: ${chapter.chapterName} (NCERT chapter ${chapter.chapterNumber})`,
    `Duration: ${durationMinutes} minutes`,
    'Chapter learning outcomes (NCERT):',
    ...chapter.learningOutcomes.map((o) => `- ${o}`),
  ];
  if (chapter.keyTerms && chapter.keyTerms.length > 0) {
    lines.push(`Key terms: ${chapter.keyTerms.join(', ')}`);
  }
  if (chapter.aiCtConceptTags.length > 0) {
    lines.push(`AI-CT concepts touched: ${chapter.aiCtConceptTags.join(', ')}`);
  }
  if (studioPreference) {
    lines.push(`Studio preference: ${studioPreference}`);
  }
  lines.push('');
  lines.push('Return JSON only.');
  return lines.join('\n');
}

export interface GenerateLessonPlanInput {
  chapterId: string;
  durationMinutes: number;
  locale?: Locale;
  studioPreference?: StudioId;
}

export interface GenerateLessonPlanResult {
  draft: LessonPlanDraft;
  chapter: ChapterEntry;
}

export async function generateLessonPlan(
  input: GenerateLessonPlanInput,
): Promise<GenerateLessonPlanResult> {
  const locale: Locale = isSupportedLocale(input.locale) ? input.locale : 'en';
  const duration = Math.max(15, Math.min(input.durationMinutes ?? 40, 120));
  const chapter = getChapter(input.chapterId);
  if (!chapter) {
    throw new AppException('NOT_FOUND', `Chapter "${input.chapterId}" not in NCERT index.`, 404);
  }

  const userMessage = buildUserMessage({
    chapter,
    durationMinutes: duration,
    studioPreference: input.studioPreference,
    locale,
  });

  const draft = await generateJsonWithClaude<LessonPlanDraft>({
    systemPrompt: buildLocaleSystemPrompt({ basePrompt: SYSTEM_PROMPT, locale }),
    userMessage,
    maxTokens: 1100,
    temperature: 0.5,
  });

  const safe: LessonPlanDraft = {
    learningOutcomes: clamp(
      Array.isArray(draft.learningOutcomes)
        ? draft.learningOutcomes.filter((o): o is string => typeof o === 'string')
        : [],
      6,
    ),
    hookActivity: typeof draft.hookActivity === 'string' ? draft.hookActivity : '',
    mainActivity: {
      title: typeof draft.mainActivity?.title === 'string' ? draft.mainActivity.title : '',
      description:
        typeof draft.mainActivity?.description === 'string' ? draft.mainActivity.description : '',
      linkedStudio: toStudio((draft.mainActivity as Record<string, unknown> | undefined)?.linkedStudio),
    },
    closure: typeof draft.closure === 'string' ? draft.closure : '',
    assessment: {
      type: typeof draft.assessment?.type === 'string' ? draft.assessment.type : '',
      sample: typeof draft.assessment?.sample === 'string' ? draft.assessment.sample : '',
    },
    differentiation: {
      lower:
        typeof draft.differentiation?.lower === 'string' ? draft.differentiation.lower : '',
      higher:
        typeof draft.differentiation?.higher === 'string' ? draft.differentiation.higher : '',
    },
    materials: clamp(
      Array.isArray(draft.materials)
        ? draft.materials.filter((m): m is string => typeof m === 'string')
        : [],
      10,
    ),
  };

  return { draft: safe, chapter };
}

export type { Subject };
