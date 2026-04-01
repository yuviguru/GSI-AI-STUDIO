/** Beat the AI types — Human vs AI creative challenge rounds + skill progression */

export type BeatTheAiCategory =
  | 'story_sprint'
  | 'rhyme_time'
  | 'fact_or_bluff'
  | 'comeback_king'
  | 'explain_it'
  | 'debate_champ'
  | 'math_wizard'
  | 'science_detective'
  | 'code_cracker';

export type BeatTheAiResult = 'kid_wins' | 'ai_wins' | 'tie';

export type BeatTheAiDifficulty = 'easy' | 'medium' | 'hard';

/** 6 kid skills that level up through Beat the AI rounds */
export type BeatTheAiSkillId =
  | 'creativity'      // Original ideas, unexpected twists
  | 'storytelling'    // Narrative flow, character voice
  | 'wordplay'        // Wit, humor, puns, rhymes
  | 'knowledge'       // Facts, accuracy, topic depth
  | 'speedThinking'   // Quick responses under pressure
  | 'culturalConnect'; // Indian cultural references, local flavor

export interface BeatTheAiPrompt {
  text: string;
  theme: string;
  timeLimit: number; // seconds
  category: BeatTheAiCategory;
  isIndiaThemed: boolean;
}

export interface BeatTheAiScores {
  creativity: number; // 1-5
  funFactor: number;  // 1-5
  accuracy: number;   // 1-5
  heart: number;      // 1-5
}

export interface BeatTheAiXray {
  concept: string;
  explanation: string;
  curriculumTag: string;
}

export type BeatTheAiRoundStatus = 'pending' | 'revealed' | 'completed';

/** Firestore document in beatTheAiRounds collection */
export interface BeatTheAiRound {
  id: string;
  status: BeatTheAiRoundStatus;
  category: BeatTheAiCategory;
  prompt: BeatTheAiPrompt;
  kidResponse: string;
  aiResponse: string;
  kidScores: BeatTheAiScores;
  aiScores: BeatTheAiScores;
  kidAvgScore: number;
  aiAvgScore: number;
  result: BeatTheAiResult;
  timeUsedSeconds: number;
  aiDifficulty: BeatTheAiDifficulty;
  skillXpEarned: Partial<Record<BeatTheAiSkillId, number>>;
  aiPointsEarned: number;
  feedback: BeatTheAiFeedback;
  aiXray: BeatTheAiXray;
  sessionId: string;
  userId?: string;
  completedAt: Date;
  createdAt: Date;
}

// ─── Skill System ──────────────────────────────────────────

export interface SkillLevel {
  xp: number;
  level: number;       // 1-5
  title: string;       // Beginner, Apprentice, Creator, Master, Legend
  nextLevelXp: number; // XP needed for next level
}

/** All 6 skills with current XP and level */
export type BeatTheAiSkills = Record<BeatTheAiSkillId, SkillLevel>;

/** Skill level thresholds */
export const SKILL_LEVELS = [
  { level: 1, title: 'Beginner',   minXp: 0,   badge: 'seed' },
  { level: 2, title: 'Apprentice', minXp: 51,  badge: 'sprout' },
  { level: 3, title: 'Creator',    minXp: 151, badge: 'tree' },
  { level: 4, title: 'Master',     minXp: 301, badge: 'star' },
  { level: 5, title: 'Legend',     minXp: 501, badge: 'crown' },
] as const;

/** Category → primary skill mapping */
export const CATEGORY_PRIMARY_SKILL: Record<BeatTheAiCategory, BeatTheAiSkillId> = {
  story_sprint: 'storytelling',
  rhyme_time: 'wordplay',
  fact_or_bluff: 'creativity',
  comeback_king: 'wordplay',
  explain_it: 'knowledge',
  debate_champ: 'storytelling',
  math_wizard: 'speedThinking',
  science_detective: 'knowledge',
  code_cracker: 'creativity',
};

/** Score criteria → skill mapping (for bonus XP when score ≥ 4) */
export const SCORE_SKILL_MAP: Record<keyof BeatTheAiScores, BeatTheAiSkillId> = {
  creativity: 'creativity',
  funFactor: 'storytelling',
  accuracy: 'knowledge',
  heart: 'culturalConnect',
};

/** Skill metadata for UI */
export interface BeatTheAiSkillInfo {
  id: BeatTheAiSkillId;
  name: string;
  icon: string;
  description: string;
  color: string; // Tailwind color for UI
}

// ─── API Types ──────────────────────────────────────────────

/** Response from POST /api/beat-the-ai/start */
export interface BeatTheAiStartResponse {
  roundId: string;
  prompt: BeatTheAiPrompt;
  aiDifficulty: BeatTheAiDifficulty;
}

/** Phase 1: Kid submits their response text */
export interface BeatTheAiSubmitResponseRequest {
  roundId: string;
  kidResponse: string;
  timeUsedSeconds: number;
}

/** Phase 1 response: AI's response revealed */
export interface BeatTheAiSubmitResponseResult {
  aiResponse: string;
  aiXray: BeatTheAiXray;
}

/** AI judge feedback for the kid */
export interface BeatTheAiFeedback {
  kidFeedback: string;   // Encouraging feedback for the kid (2-3 sentences)
  aiFeedback: string;    // Brief note on what the AI did well/differently
  tip: string;           // One actionable tip for next time
}

/** Phase 2: Request AI to judge both responses */
export interface BeatTheAiJudgeRequest {
  roundId: string;
  judge: true;
}

/** Phase 2 response: Full results with AI-judged scores, feedback, XP */
export interface BeatTheAiSubmitResponse {
  roundId: string;
  aiResponse: string;
  kidScores: BeatTheAiScores;
  aiScores: BeatTheAiScores;
  kidAvgScore: number;
  aiAvgScore: number;
  result: BeatTheAiResult;
  feedback: BeatTheAiFeedback;
  aiPointsEarned: number;
  skillXpEarned: Partial<Record<BeatTheAiSkillId, number>>;
  aiXray: BeatTheAiXray;
  levelUps: BeatTheAiSkillId[];
}

/** Response from GET /api/beat-the-ai/stats */
export interface BeatTheAiStats {
  totalRounds: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  currentStreak: number;
  longestStreak: number;
  favoriteCategory: BeatTheAiCategory | null;
  totalPointsEarned: number;
  byCategory: Partial<Record<BeatTheAiCategory, { rounds: number; wins: number }>>;
}

/** Response from GET /api/beat-the-ai/skills */
export interface BeatTheAiSkillsResponse {
  skills: BeatTheAiSkills;
  overallLevel: number;
  totalXp: number;
}

/** Category metadata for the UI category picker */
export interface BeatTheAiCategoryInfo {
  id: BeatTheAiCategory;
  name: string;
  description: string;
  icon: string;
  primarySkill: BeatTheAiSkillId;
  timeLimit: number; // seconds
  minChars: number;
  maxChars: number;
}

// ─── Constants ──────────────────────────────────────────────

export const BEAT_THE_AI_CATEGORIES: BeatTheAiCategoryInfo[] = [
  {
    id: 'story_sprint',
    name: 'Story Sprint',
    description: 'Write a short story in 3 minutes!',
    icon: '📖',
    primarySkill: 'storytelling',
    timeLimit: 180,
    minChars: 30,
    maxChars: 2000,
  },
  {
    id: 'rhyme_time',
    name: 'Rhyme Time',
    description: 'Write a poem that rhymes better!',
    icon: '🎵',
    primarySkill: 'wordplay',
    timeLimit: 120,
    minChars: 10,
    maxChars: 1000,
  },
  {
    id: 'fact_or_bluff',
    name: 'Fact or Bluff',
    description: 'Write a surprising fact, or a convincing bluff!',
    icon: '🤔',
    primarySkill: 'creativity',
    timeLimit: 90,
    minChars: 10,
    maxChars: 300,
  },
  {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Hit back with the wittiest one-liner!',
    icon: '👑',
    primarySkill: 'wordplay',
    timeLimit: 60,
    minChars: 5,
    maxChars: 150,
  },
  {
    id: 'explain_it',
    name: 'Explain It',
    description: 'Make a tricky topic super simple!',
    icon: '💡',
    primarySkill: 'knowledge',
    timeLimit: 120,
    minChars: 10,
    maxChars: 500,
  },
  {
    id: 'debate_champ',
    name: 'Debate Champ',
    description: 'Argue your side and win the debate!',
    icon: '🎤',
    primarySkill: 'storytelling',
    timeLimit: 120,
    minChars: 15,
    maxChars: 600,
  },
  {
    id: 'math_wizard',
    name: 'Math Wizard',
    description: 'Crunch numbers and explain your thinking!',
    icon: '🧮',
    primarySkill: 'speedThinking',
    timeLimit: 90,
    minChars: 5,
    maxChars: 400,
  },
  {
    id: 'science_detective',
    name: 'Science Detective',
    description: 'What would happen if...? Write your hypothesis!',
    icon: '🔬',
    primarySkill: 'knowledge',
    timeLimit: 120,
    minChars: 10,
    maxChars: 500,
  },
  {
    id: 'code_cracker',
    name: 'Code Cracker',
    description: 'Solve the puzzle before AI does!',
    icon: '🧩',
    primarySkill: 'creativity',
    timeLimit: 90,
    minChars: 3,
    maxChars: 300,
  },
];

export const SKILL_INFO: Record<BeatTheAiSkillId, BeatTheAiSkillInfo> = {
  creativity: {
    id: 'creativity',
    name: 'Creativity',
    icon: '🎨',
    description: 'Original ideas and unexpected twists',
    color: 'text-purple-500',
  },
  storytelling: {
    id: 'storytelling',
    name: 'Storytelling',
    icon: '📚',
    description: 'Narrative flow and character voice',
    color: 'text-blue-500',
  },
  wordplay: {
    id: 'wordplay',
    name: 'Wordplay',
    icon: '✨',
    description: 'Wit, humor, puns, and rhymes',
    color: 'text-amber-500',
  },
  knowledge: {
    id: 'knowledge',
    name: 'Knowledge',
    icon: '🔬',
    description: 'Facts, accuracy, and topic depth',
    color: 'text-green-500',
  },
  speedThinking: {
    id: 'speedThinking',
    name: 'Speed Thinking',
    icon: '⚡',
    description: 'Quick responses under pressure',
    color: 'text-red-500',
  },
  culturalConnect: {
    id: 'culturalConnect',
    name: 'Cultural Connect',
    icon: '🇮🇳',
    description: 'Indian cultural references and local flavor',
    color: 'text-orange-500',
  },
};

// ─── Daily Themes ────────────────────────────────────────────

export interface DailyTheme {
  dayOfWeek: number; // 0=Sunday, 1=Monday, …6=Saturday
  category: BeatTheAiCategory | 'random';
  themeName: string;
  tagline: string;
}

export const DAILY_THEMES: DailyTheme[] = [
  { dayOfWeek: 0, category: 'random',             themeName: 'Surprise Sunday',    tagline: 'Anything goes!' },
  { dayOfWeek: 1, category: 'math_wizard',         themeName: 'Maths Monday',       tagline: 'Crunch numbers, beat the bot!' },
  { dayOfWeek: 2, category: 'fact_or_bluff',       themeName: 'Truth Tuesday',      tagline: 'Real or fake? You decide!' },
  { dayOfWeek: 3, category: 'code_cracker',        themeName: 'Puzzle Wednesday',   tagline: 'Crack the code before AI does!' },
  { dayOfWeek: 4, category: 'science_detective',   themeName: 'Science Thursday',   tagline: 'Think like a scientist!' },
  { dayOfWeek: 5, category: 'rhyme_time',          themeName: 'Rhyme Friday',       tagline: 'End the week in verse!' },
  { dayOfWeek: 6, category: 'story_sprint',        themeName: 'Story Saturday',     tagline: 'Spin a tale, beat the AI!' },
];

/** Get today's daily theme based on local date */
export function getDailyTheme(): DailyTheme {
  return DAILY_THEMES[new Date().getDay()]!;
}
