/** Beat the AI types — Human vs AI creative challenge rounds + skill progression */

export type BeatTheAiCategory = 'story_sprint' | 'quiz_whiz' | 'caption_battle' | 'rhyme_time';

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
  quiz_whiz: 'knowledge',
  caption_battle: 'wordplay',
  rhyme_time: 'wordplay',
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

/** Phase 2: Kid submits ratings for both sides */
export interface BeatTheAiSubmitRatingsRequest {
  roundId: string;
  kidScores: BeatTheAiScores;
  aiScores: BeatTheAiScores;
}

/** Phase 2 response: Full results with XP and points */
export interface BeatTheAiSubmitResponse {
  roundId: string;
  aiResponse: string;
  kidAvgScore: number;
  aiAvgScore: number;
  result: BeatTheAiResult;
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
    minChars: 50,
    maxChars: 2000,
  },
  {
    id: 'quiz_whiz',
    name: 'Quiz Whiz',
    description: 'Create quiz questions that stump AI!',
    icon: '🧠',
    primarySkill: 'knowledge',
    timeLimit: 240,
    minChars: 30,
    maxChars: 2000,
  },
  {
    id: 'caption_battle',
    name: 'Caption Battle',
    description: 'Write the wittiest caption!',
    icon: '💬',
    primarySkill: 'wordplay',
    timeLimit: 90,
    minChars: 10,
    maxChars: 500,
  },
  {
    id: 'rhyme_time',
    name: 'Rhyme Time',
    description: 'Write a poem that rhymes better!',
    icon: '🎵',
    primarySkill: 'wordplay',
    timeLimit: 120,
    minChars: 20,
    maxChars: 1000,
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
