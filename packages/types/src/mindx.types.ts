/** MindX types — IELTS-style AI skill assessment + mentor feedback */

export type SkillArenaModule = 'speaking' | 'listening' | 'thinking' | 'reading';

export type SkillArenaDifficulty = 'easy' | 'medium' | 'hard';

export type SkillArenaBandTitle = 'Starter' | 'Explorer' | 'Achiever' | 'Expert' | 'Champion';

/** Challenge question types per module */
export type SpeakingChallengeType = 'read_aloud' | 'describe' | 'respond';
export type ListeningChallengeType = 'comprehension' | 'follow_instructions' | 'key_points';
export type ThinkingChallengeType = 'logic' | 'what_if' | 'odd_one_out' | 'analogy';
export type ReadingChallengeType = 'comprehension' | 'inference' | 'vocabulary' | 'summarize';

export type SkillArenaChallengeType =
  | SpeakingChallengeType
  | ListeningChallengeType
  | ThinkingChallengeType
  | ReadingChallengeType;

// ─── Challenge & Question ──────────────────────────────────

export interface SkillArenaQuestion {
  text: string;                    // Main question/instruction text
  passage?: string;                // Reading/listening passage or speaking text
  audioText?: string;              // Text to be read via TTS (listening module)
  options?: string[];              // MCQ options (if applicable)
  correctOption?: string;          // Correct answer for MCQ
  timeLimit: number;               // Seconds allowed for this challenge
  isIndiaThemed?: boolean;         // India-culturally-relevant content
}

export interface SkillArenaChallenge {
  id: string;
  type: SkillArenaChallengeType;
  module: SkillArenaModule;
  question: SkillArenaQuestion;
}

export interface SkillArenaAnswer {
  challengeId: string;
  text?: string;                   // Text answer (thinking/reading)
  voiceTranscript?: string;        // Speech-to-text transcript (speaking)
  selectedOption?: string;         // Selected MCQ option
  timeUsedSeconds: number;
}

export interface SkillArenaChallengeResult {
  challengeId: string;
  score: number;                   // Points earned for this challenge
  maxScore: number;                // Maximum possible points (typically 20)
  feedback: string;                // One-line feedback from AI
}

// ─── Mentor Feedback ───────────────────────────────────────

export interface SkillArenaMentorFeedback {
  strengths: string[];             // 2-3 things kid did well
  growthAreas: string[];           // 2-3 areas to improve (positive framing)
  tips: string[];                  // 1-2 actionable practice tips
  recommendedPractice: SkillArenaChallengeType; // Which challenge type to focus on
  encouragement: string;           // Kid-friendly motivational message
}

export interface SkillArenaXray {
  concept: string;
  explanation: string;
  curriculumTag: string;
}

// ─── Assessment (Firestore document) ───────────────────────

export interface SkillArenaAssessment {
  id: string;
  module: SkillArenaModule;
  difficulty: SkillArenaDifficulty;
  challenges: Array<{
    challenge: SkillArenaChallenge;
    answer: SkillArenaAnswer;
    result: SkillArenaChallengeResult;
  }>;
  score: number;                   // Overall score 0-100
  band: number;                    // Band level 1-5
  bandTitle: SkillArenaBandTitle;
  mentorFeedback: SkillArenaMentorFeedback;
  aiXray: SkillArenaXray;
  timeUsedSeconds: number;
  aiPointsEarned: number;
  previousBand?: number;           // Previous band for this module
  sessionId: string;
  userId?: string;
  completedAt: Date;
  createdAt: Date;
}

// ─── Band System ───────────────────────────────────────────

export interface SkillArenaBand {
  band: number;        // 1-5
  title: SkillArenaBandTitle;
  minScore: number;
  badge: string;       // Icon/badge identifier
}

export const SKILL_ARENA_BANDS: readonly SkillArenaBand[] = [
  { band: 1, title: 'Starter',   minScore: 0,  badge: 'seed' },
  { band: 2, title: 'Explorer',  minScore: 21, badge: 'compass' },
  { band: 3, title: 'Achiever',  minScore: 41, badge: 'star' },
  { band: 4, title: 'Expert',    minScore: 61, badge: 'medal' },
  { band: 5, title: 'Champion',  minScore: 81, badge: 'crown' },
] as const;

// ─── Module Progress ───────────────────────────────────────

export interface SkillArenaModuleProgress {
  module: SkillArenaModule;
  band: number;
  bandTitle: SkillArenaBandTitle;
  score: number;                   // Latest score
  assessments: number;             // Total assessments completed
  trend: 'improving' | 'stable' | 'new';
}

export interface SkillArenaProgress {
  modules: Record<SkillArenaModule, SkillArenaModuleProgress>;
  overallBand: number;
  totalAssessments: number;
  totalPointsEarned: number;
  strongestModule: SkillArenaModule | null;
  recommendedModule: SkillArenaModule | null;
}

// ─── Module Metadata (UI) ──────────────────────────────────

export interface SkillArenaModuleInfo {
  id: SkillArenaModule;
  name: string;
  description: string;
  icon: string;
  estimatedTime: number;           // Minutes per assessment
  challengeTypes: SkillArenaChallengeType[];
  requiresMic: boolean;            // Speaking module needs mic
}

export const MODULE_INFO: Record<SkillArenaModule, SkillArenaModuleInfo> = {
  speaking: {
    id: 'speaking',
    name: 'Speaking',
    description: 'Read aloud, describe scenarios, and express your ideas',
    icon: '🎤',
    estimatedTime: 8,
    challengeTypes: ['read_aloud', 'describe', 'respond'],
    requiresMic: true,
  },
  listening: {
    id: 'listening',
    name: 'Listening',
    description: 'Listen carefully, follow instructions, and catch key points',
    icon: '👂',
    estimatedTime: 6,
    challengeTypes: ['comprehension', 'follow_instructions', 'key_points'],
    requiresMic: false,
  },
  thinking: {
    id: 'thinking',
    name: 'Thinking',
    description: 'Solve puzzles, spot patterns, and reason through problems',
    icon: '🧠',
    estimatedTime: 7,
    challengeTypes: ['logic', 'what_if', 'odd_one_out', 'analogy'],
    requiresMic: false,
  },
  reading: {
    id: 'reading',
    name: 'Reading',
    description: 'Understand passages, make inferences, and summarize ideas',
    icon: '📖',
    estimatedTime: 6,
    challengeTypes: ['comprehension', 'inference', 'vocabulary', 'summarize'],
    requiresMic: false,
  },
};

/** AI X-Ray concepts per module (for curriculum tie-in) */
export const MODULE_XRAY_CONCEPTS: Record<SkillArenaModule, { concept: string; curriculumTag: string }> = {
  speaking: { concept: 'speech_recognition_nlp', curriculumTag: 'ai_applications_nlp' },
  listening: { concept: 'audio_processing', curriculumTag: 'ai_applications_audio' },
  thinking: { concept: 'logical_reasoning_ai', curriculumTag: 'ai_basics_reasoning' },
  reading: { concept: 'text_comprehension_nlp', curriculumTag: 'ai_applications_nlp' },
};

// ─── API Types ─────────────────────────────────────────────

/** Request to POST /api/skill-arena/start */
export interface SkillArenaStartRequest {
  module: SkillArenaModule;
}

/** Response from POST /api/skill-arena/start */
export interface SkillArenaStartResponse {
  assessmentId: string;
  module: SkillArenaModule;
  difficulty: SkillArenaDifficulty;
  challenges: SkillArenaChallenge[];
  totalChallenges: number;
  estimatedTime: string;
}

/** Request to POST /api/skill-arena/evaluate */
export interface SkillArenaEvaluateRequest {
  assessmentId: string;
  answers: SkillArenaAnswer[];
}

/** Response from POST /api/skill-arena/evaluate */
export interface SkillArenaEvaluateResponse {
  assessmentId: string;
  score: number;
  band: number;
  bandTitle: SkillArenaBandTitle;
  challengeResults: SkillArenaChallengeResult[];
  mentorFeedback: SkillArenaMentorFeedback;
  aiPointsEarned: number;
  previousBand: number | null;
  improved: boolean;
  aiXray: SkillArenaXray;
}

/** Response from GET /api/skill-arena/progress */
export type SkillArenaProgressResponse = SkillArenaProgress;

/** Response from GET /api/skill-arena/history */
export interface SkillArenaHistoryItem {
  id: string;
  module: SkillArenaModule;
  score: number;
  band: number;
  bandTitle: SkillArenaBandTitle;
  difficulty: SkillArenaDifficulty;
  aiPointsEarned: number;
  completedAt: string;
}
