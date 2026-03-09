/** Cerebro types — Competitive exam with anti-malpractice + multi-level leaderboards (Phase 2+) */

// ─── Competition ────────────────────────────────────────────

export type CompetitionStatus =
  | 'upcoming'
  | 'registration'
  | 'prelims'
  | 'semifinals'
  | 'finals'
  | 'completed';

export type AgeGroup = 'junior' | 'middle' | 'senior';

/** junior: grades 3-5 (ages 8-10), middle: grades 6-8 (ages 11-13), senior: grades 9-12 (ages 14-17) */
export const AGE_GROUP_INFO: Record<AgeGroup, { label: string; grades: string; ageRange: string }> = {
  junior: { label: 'Junior', grades: '3–5', ageRange: '8–10' },
  middle: { label: 'Middle', grades: '6–8', ageRange: '11–13' },
  senior: { label: 'Senior', grades: '9–12', ageRange: '14–17' },
};

export type ProctorLevel = 'browser_lockdown' | 'ai_monitoring' | 'full_proctor';

export type RoundStatus = 'upcoming' | 'active' | 'completed';

export interface CompetitionRound {
  round: number;                      // 1=prelims, 2=semis, 3=finals
  name: string;                       // "Prelims", "Semi-Finals", "Finals"
  examWindow: {
    start: string;                    // ISO timestamp
    end: string;                      // ISO timestamp
  };
  advancePercent: number;             // Top X% advance to next round
  proctorLevel: ProctorLevel;
  status: RoundStatus;
}

export interface QuestionConfig {
  totalQuestions: number;
  mcqPercent: number;                 // % of MCQ questions
  creativePercent: number;            // % of creative/text questions
  reasoningPercent: number;           // % of reasoning questions
  applicationPercent: number;         // % of real-world application questions
  timeLimitMinutes: number;
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  status: CompetitionStatus;
  ageGroups: AgeGroup[];
  rounds: CompetitionRound[];
  questionConfig: QuestionConfig;
  prizesByLevel: Record<LeaderboardLevel, string[]>;
  registrationStart: Date;
  registrationEnd: Date;
  participantCount: number;
  createdBy: string;
  createdAt: Date;
}

// ─── Exam Questions ─────────────────────────────────────────

export type ExamQuestionType = 'mcq' | 'creative' | 'reasoning' | 'application';

export type ExamQuestionCategory =
  | 'ai_knowledge'
  | 'creative_challenge'
  | 'reasoning'
  | 'application'
  | 'general_knowledge';

export interface ExamQuestion {
  id: string;
  type: ExamQuestionType;
  category: ExamQuestionCategory;
  text: string;
  options?: string[];                 // MCQ options (shuffled per student)
  correctOption?: string;             // Server-side only — never sent to client
  timeLimit: number;                  // Seconds allowed
  points: number;                     // Max points for this question
}

// ─── Exam Session ───────────────────────────────────────────

export type FlagLevel = 'green' | 'yellow' | 'orange' | 'red';
export type ReviewStatus = 'pending' | 'approved' | 'suspended';

export type ProctorEventType =
  | 'tab_switch'
  | 'fullscreen_exit'
  | 'copy_attempt'
  | 'devtools_open'
  | 'resize'
  | 'webcam_violation';

export interface ProctorEvent {
  type: ProctorEventType;
  timestamp: string;                  // ISO timestamp
  details: string;
}

export interface ExamAnswer {
  questionId: string;
  selectedOption?: string;            // MCQ answer
  text?: string;                      // Creative/reasoning text answer
  timeUsedSeconds: number;
  score: number;
  maxScore: number;
  keystrokeTimings?: number[];        // Inter-keystroke intervals (ms) for anomaly detection
}

export interface ExamFlags {
  level: FlagLevel;
  details: string[];                  // Flag reasons
  reviewStatus: ReviewStatus;
}

export interface TypingCadenceEntry {
  questionId: string;
  timings: number[];                  // Inter-keystroke intervals in ms
}

export interface ExamSession {
  id: string;
  competitionId: string;
  roundNumber: number;
  userId: string;
  kidId: string;
  ageGroup: AgeGroup;
  questions: ExamQuestion[];          // Randomized question set
  answers: ExamAnswer[];
  score: number;                      // Total score (0-100)
  rank?: number;                      // Assigned after exam window closes
  timeUsedSeconds: number;
  proctorEvents: ProctorEvent[];
  flags: ExamFlags;
  deviceFingerprint: string;          // Browser/device hash
  ipHash: string;                     // Hashed IP (privacy)
  typingCadence?: TypingCadenceEntry[];
  schoolId: string;
  district: string;
  city: string;
  state: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

// ─── Leaderboard ────────────────────────────────────────────

export type LeaderboardLevel = 'school' | 'district' | 'city' | 'state' | 'national';

export interface LeaderboardEntry {
  rank: number;
  kidName: string;                    // Display name only (privacy)
  schoolName: string;
  score: number;
  flagLevel: FlagLevel;
}

export interface Leaderboard {
  id: string;                         // Composite: {competitionId}_{round}_{ageGroup}_{level}_{scope}
  competitionId: string;
  roundNumber: number;
  ageGroup: AgeGroup;
  level: LeaderboardLevel;
  scope: string;                      // School/district/city/state name or "all" for national
  entries: LeaderboardEntry[];
  totalParticipants: number;
  updatedAt: Date;
}

// ─── Score Breakdown ────────────────────────────────────────

export interface ScoreBreakdown {
  ai_knowledge: { score: number; total: number };
  creative_challenge: { score: number; total: number };
  reasoning: { score: number; total: number };
  application: { score: number; total: number };
}

// ─── API Types ──────────────────────────────────────────────

/** Response from GET /api/talent-quest/competitions */
export interface CompetitionsListResponse {
  items: Array<{
    id: string;
    title: string;
    status: CompetitionStatus;
    ageGroups: AgeGroup[];
    registrationEnd: string;
    rounds: CompetitionRound[];
    participantCount: number;
    prizesByLevel: Record<LeaderboardLevel, string[]>;
  }>;
}

/** Request to POST /api/talent-quest/register */
export interface RegisterRequest {
  competitionId: string;
  kidId: string;
  ageGroup: AgeGroup;
}

/** Response from POST /api/talent-quest/register */
export interface RegisterResponse {
  registrationId: string;
  competitionId: string;
  examWindow: { start: string; end: string };
  instructions: string;
}

/** Request to POST /api/talent-quest/start-exam */
export interface StartExamRequest {
  competitionId: string;
  roundNumber: number;
  deviceFingerprint: string;
}

/** Response from POST /api/talent-quest/start-exam */
export interface StartExamResponse {
  examSessionId: string;
  questions: Omit<ExamQuestion, 'correctOption'>[]; // Never send correct answers to client
  totalQuestions: number;
  totalTimeMinutes: number;
  proctorLevel: ProctorLevel;
  serverStartTime: string;
}

/** Request to POST /api/talent-quest/submit-answer */
export interface SubmitAnswerRequest {
  examSessionId: string;
  questionId: string;
  selectedOption?: string;
  text?: string;
  timeUsedSeconds: number;
  keystrokeTimings?: number[];
}

/** Response from POST /api/talent-quest/submit-answer */
export interface SubmitAnswerResponse {
  accepted: boolean;
  questionsRemaining: number;
}

/** Request to POST /api/talent-quest/finish-exam */
export interface FinishExamRequest {
  examSessionId: string;
}

/** Response from POST /api/talent-quest/finish-exam */
export interface FinishExamResponse {
  score: number;
  totalPossible: number;
  breakdown: ScoreBreakdown;
  timeUsedMinutes: number;
  provisionalRank: number;
  totalParticipants: number;
  flagLevel: FlagLevel;
  message: string;
}

/** Request to POST /api/talent-quest/proctor-event */
export interface ProctorEventRequest {
  examSessionId: string;
  type: ProctorEventType;
  details: string;
  timestamp: string;
}

/** Response from POST /api/talent-quest/proctor-event */
export interface ProctorEventResponse {
  warning?: string;
  tabSwitchCount?: number;
  maxAllowed?: number;
}

/** Response from GET /api/talent-quest/leaderboard */
export interface LeaderboardResponse {
  level: LeaderboardLevel;
  scope: string;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  myRank?: number;
  myScore?: number;
}

/** Response from GET /api/talent-quest/my-results */
export interface MyResultsResponse {
  results: Array<{
    competitionId: string;
    competitionTitle: string;
    round: number;
    score: number;
    rank: number;
    totalParticipants: number;
    advanced: boolean;
    flagLevel: FlagLevel;
  }>;
}

// ─── Anti-Malpractice Config ────────────────────────────────

/** Browser lockdown settings (client-side enforcement) */
export interface BrowserLockdownConfig {
  enforceFullscreen: boolean;
  detectTabSwitch: boolean;
  blockCopyPaste: boolean;
  blockDevTools: boolean;
  blockRightClick: boolean;
  maxTabSwitches: number;             // Auto-submit after this many
}

/** Anomaly detection thresholds (server-side) */
export interface AnomalyThresholds {
  minTimePerMcq: number;              // Seconds — below this flags suspicious
  maxSimilarityScore: number;         // 0-1 — answer similarity with nearby IPs
  typingCadenceMinVariance: number;   // Below this suggests copy-paste
  maxIpClusterSize: number;           // Max same-IP exam sessions before flag
}

export const DEFAULT_LOCKDOWN: BrowserLockdownConfig = {
  enforceFullscreen: true,
  detectTabSwitch: true,
  blockCopyPaste: true,
  blockDevTools: true,
  blockRightClick: true,
  maxTabSwitches: 3,
};

export const DEFAULT_ANOMALY_THRESHOLDS: AnomalyThresholds = {
  minTimePerMcq: 3,
  maxSimilarityScore: 0.85,
  typingCadenceMinVariance: 10,
  maxIpClusterSize: 5,
};
