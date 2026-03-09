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

/** Firestore document in beatTheAiRounds collection */
export interface BeatTheAiRound {
  id: string;
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

/** Request to POST /api/beat-the-ai/submit */
export interface BeatTheAiSubmitRequest {
  roundId: string;
  kidResponse: string;
  kidScores: BeatTheAiScores;
  aiScores: BeatTheAiScores;
}

/** Response from POST /api/beat-the-ai/submit */
export interface BeatTheAiSubmitResponse {
  roundId: string;
  aiResponse: string;
  kidAvgScore: number;
  aiAvgScore: number;
  result: BeatTheAiResult;
  aiPointsEarned: number;
  skillXpEarned: Partial<Record<BeatTheAiSkillId, number>>;
  aiXray: BeatTheAiXray;
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
