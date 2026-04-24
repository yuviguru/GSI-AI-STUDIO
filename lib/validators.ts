import { z } from 'zod';

/** Story generation input */
export const storyInputSchema = z.object({
  premise: z.string().min(5, 'Tell us a bit more about your story idea').max(500),
  characters: z.array(z.string().max(50)).max(5).optional(),
  setting: z.string().max(100).optional(),
  genre: z.enum(['adventure', 'sci-fi', 'fantasy', 'mystery', 'funny', 'friendship']).optional(),
  pages: z.number().int().min(1).max(8).default(5),
  style: z.enum(['watercolor', 'cartoon', 'pixel-art', 'comic']).default('cartoon'),
  ageGroup: z.enum(['8-10', '10-12', '12-14', '14-17']),
  remixedFromId: z.string().max(128).optional(),
});

/** Music generation input */
export const musicInputSchema = z.object({
  mood: z.enum(['happy', 'chill', 'energetic', 'dreamy', 'epic']),
  genre: z.enum(['pop', 'rock', 'electronic', 'classical', 'hip-hop', 'folk']),
  theme: z.string().max(200).optional(),
  duration: z.number().int().min(15).max(60).default(30),
  instruments: z.array(z.string()).max(4).optional(),
  lyricsPrompt: z.string().max(500).optional(),
  ageGroup: z.enum(['8-10', '10-12', '12-14', '14-17']),
  remixedFromId: z.string().max(128).optional(),
});

/** Quiz generation input */
export const quizInputSchema = z.object({
  topic: z.string().min(2, "What's the quiz about?").max(200),
  format: z.enum(['trivia', 'true_false', 'fill_blank', 'adventure']).default('trivia'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  questionCount: z.number().int().min(3).max(20).default(10),
  ageGroup: z.enum(['8-10', '10-12', '12-14', '14-17']),
  remixedFromId: z.string().max(128).optional(),
});

/** Game generation input */
export const gameInputSchema = z.object({
  premise: z.string().min(5, 'Tell us more about your adventure idea!').max(500),
  setting: z
    .enum([
      'fantasy_world',
      'space_station',
      'underwater_city',
      'enchanted_forest',
      'indian_palace',
      'time_machine',
      'mystery_island',
      'futuristic_city',
    ])
    .optional(),
  characterName: z.string().max(30).optional().default('You'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  ageGroup: z.enum(['8-10', '10-12', '12-14', '14-17']),
  remixedFromId: z.string().max(128).optional(),
});

/** Comic generation input */
export const comicInputSchema = z.object({
  premise: z.string().min(5, 'Tell us more about your comic idea!').max(500),
  style: z.enum(['manga', 'cartoon', 'superhero', 'indie', 'chibi']).default('cartoon'),
  panelCount: z.number().int().min(4).max(8).default(4),
  characters: z.array(z.string().max(100)).max(4).optional(),
  ageGroup: z.enum(['8-10', '10-12', '12-14', '14-17']),
});

/** Creation save input */
export const saveCreationSchema = z.object({
  type: z.enum(['story', 'music', 'quiz', 'game', 'comic']),
  title: z.string().min(1).max(200),
  prompt: z.string().max(2000).default(''),
  content: z.record(z.unknown()),
  media: z.array(z.object({ url: z.string().url(), type: z.string(), alt: z.string() })).optional(),
  thumbnail: z.string().url().optional(),
  aiMetadata: z.record(z.unknown()),
  aiConceptsTaught: z.array(z.string()),
  isPublic: z.boolean().default(true),
  remixedFromId: z.string().max(128).optional(),
});

/** Kid profile input */
export const kidProfileSchema = z.object({
  name: z.string().min(1, "What's your name?").max(50),
  age: z.number().int().min(5).max(18),
  grade: z.string().min(1).max(5),
  board: z.enum(['cbse', 'icse', 'state']).optional(),
  avatar: z.string().max(30).optional(),
});

// ─── Beat the AI ─────────────────────────────────────────────

const beatTheAiCategoryEnum = z.enum([
  'story_sprint', 'rhyme_time',
  'fact_or_bluff', 'comeback_king', 'explain_it', 'debate_champ',
  'math_wizard', 'science_detective', 'code_cracker',
]);

export const beatTheAiStartSchema = z.object({
  category: beatTheAiCategoryEnum,
});

export const beatTheAiSubmitResponseSchema = z.object({
  roundId: z.string().min(1),
  kidResponse: z.string().min(3, 'Write at least 3 characters!').max(2000),
  timeUsedSeconds: z.number().int().min(0),
});

export const beatTheAiJudgeSchema = z.object({
  roundId: z.string().min(1),
  judge: z.literal(true),
});

export type StoryInput = z.infer<typeof storyInputSchema>;
export type MusicInput = z.infer<typeof musicInputSchema>;
export type QuizInput = z.infer<typeof quizInputSchema>;
export type GameInput = z.infer<typeof gameInputSchema>;
export type ComicInput = z.infer<typeof comicInputSchema>;
export type SaveCreationInput = z.infer<typeof saveCreationSchema>;
export type KidProfileInput = z.infer<typeof kidProfileSchema>;
export type BeatTheAiStartInput = z.infer<typeof beatTheAiStartSchema>;
export type BeatTheAiSubmitResponseInput = z.infer<typeof beatTheAiSubmitResponseSchema>;
export type BeatTheAiJudgeInput = z.infer<typeof beatTheAiJudgeSchema>;

// ─── MindX — Skill Arena ────────────────────────────────────

const skillArenaModuleEnum = z.enum(['speaking', 'listening', 'thinking', 'reading']);

export const skillArenaStartSchema = z.object({
  module: skillArenaModuleEnum,
});

export const skillArenaEvaluateSchema = z.object({
  assessmentId: z.string().min(1),
  answers: z.array(z.object({
    challengeId: z.string().min(1),
    text: z.string().max(2000).optional(),
    voiceTranscript: z.string().max(2000).optional(),
    selectedOption: z.string().max(200).optional(),
    timeUsedSeconds: z.number().int().min(0),
  })).min(1).max(10),
});

export type SkillArenaStartInput = z.infer<typeof skillArenaStartSchema>;
export type SkillArenaEvaluateInput = z.infer<typeof skillArenaEvaluateSchema>;

// ─── Kid CEO ────────────────────────────────────────────────

const ceoBusinessTypeEnum = z.enum([
  'lemonade', 'icecream', 'tshirt', 'games', 'crafts', 'blog', 'custom',
]);

// 15/30/45 are the supported pace values as of the PR 2 "regular vs milestone"
// redesign. Old 30/60/90 businesses still exist in prod; their docs are
// coerced via `coerceLegacyPace()` at read time — the validator only gates
// NEW business registrations, so we don't need to accept legacy values here.
const ceoPaceEnum = z.enum(['15', '30', '45']);

const ceoChoiceIdEnum = z.enum(['A', 'B', 'C']);

export const ceoRegisterSchema = z
  .object({
    businessType: ceoBusinessTypeEnum,
    businessName: z.string().min(1).max(60).optional(),
    customBusinessDescription: z.string().min(3).max(200).optional(),
    location: z.string().min(1).max(60),
    pace: ceoPaceEnum,
  })
  .refine(
    (data) => data.businessType !== 'custom' || !!data.customBusinessDescription,
    { message: 'customBusinessDescription is required for custom businesses', path: ['customBusinessDescription'] },
  );

export const ceoEventRequestSchema = z.object({
  businessId: z.string().min(1).max(128),
});

export const ceoDecideSchema = z.object({
  eventId: z.string().min(1).max(128),
  choiceId: ceoChoiceIdEnum,
  responseTimeSeconds: z.number().min(0).max(86400),
});

export const ceoProfilePublicSchema = z.object({
  businessId: z.string().min(1).max(128),
  isPublic: z.boolean(),
});

// ─── Phase 3 — Kid CEO Agents ─────────────────────────────

const ceoAgentIdEnum = z.enum([
  'design',
  'marketing',
  'ops',
  'finance',
  'customer_success',
  'product',
]);

const ceoAgentAggressivenessEnum = z.enum(['low', 'medium', 'high']);

const ceoAgentConfigSchema = z.object({
  focus: z.string().min(1).max(32),
  aggressiveness: ceoAgentAggressivenessEnum,
});

export const ceoAgentHireSchema = z.object({
  businessId: z.string().min(1).max(128),
  agentId: ceoAgentIdEnum,
  config: ceoAgentConfigSchema,
});

const ceoWorkflowIdEnum = z.enum([
  'brand.package',
  'marketing.firstCampaign',
  'marketing.dailyPush',
  'ops.setupPackage',
  'ops.scheduleCheck',
  'finance.pricingPackage',
  'finance.cashCheck',
]);

/** Brief shape varies per workflow — the executor runs the workflow's
 *  own `validateBrief` after Zod. This schema just gates on "object up
 *  to a size" to reject obvious junk before we hit the executor. */
export const ceoAgentRunSchema = z.object({
  hireId: z.string().min(1).max(128),
  workflowId: ceoWorkflowIdEnum,
  brief: z
    .record(z.string(), z.unknown())
    .refine((v) => {
      try {
        return JSON.stringify(v).length <= 2000;
      } catch {
        return false;
      }
    }, { message: 'brief exceeds max size' }),
  eventId: z.string().min(1).max(128).optional(),
});

export const ceoAgentAcceptSchema = z.object({
  artifactId: z.string().min(1).max(128),
  /** Map of asset slot → index of candidate chosen. Example for BRAND:
   *  `{ logo: 1, motto: 0 }` picks logo candidate #1 and motto #0. */
  selections: z.record(z.string(), z.number().int().nonnegative()).default({}),
  attachTo: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('business_field'), field: z.literal('brandAssets') }),
    z.object({ kind: z.literal('event'), eventId: z.string().min(1).max(128) }),
    z.object({ kind: z.literal('marketing_feed') }),
  ]),
});

export const ceoAgentRejectSchema = z.object({
  artifactId: z.string().min(1).max(128),
});

export const botLinkCreateSchema = z.object({
  botHandle: z.enum(['GSIPersonalAssistantBot', 'GSIKidCeoAssistantBot']),
  /** Optional: pre-bind this token to a specific business so the bot
   *  resumes THAT business immediately after /start redeems the link. */
  businessId: z.string().min(1).max(128).optional(),
});

export type CeoRegisterInput = z.infer<typeof ceoRegisterSchema>;
export type CeoEventRequestInput = z.infer<typeof ceoEventRequestSchema>;
export type CeoDecideInput = z.infer<typeof ceoDecideSchema>;
export type CeoProfilePublicInput = z.infer<typeof ceoProfilePublicSchema>;
export type CeoAgentHireInput = z.infer<typeof ceoAgentHireSchema>;
export type CeoAgentRunInput = z.infer<typeof ceoAgentRunSchema>;
export type CeoAgentAcceptInput = z.infer<typeof ceoAgentAcceptSchema>;
export type CeoAgentRejectInput = z.infer<typeof ceoAgentRejectSchema>;
export type BotLinkCreateInput = z.infer<typeof botLinkCreateSchema>;
