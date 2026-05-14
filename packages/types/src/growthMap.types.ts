/** GrowthMap types — Parent insight dashboard with AI-generated learning reports (Phase 2+) */

// ─── Strength Dimensions ────────────────────────────────────

export type StrengthDimension =
  | 'creativity'
  | 'language'
  | 'reasoning'
  | 'aiKnowledge'
  | 'collaboration'
  | 'persistence';

export type TrendDirection = 'improving' | 'stable' | 'declining' | 'new';

export interface StrengthScore {
  score: number;             // 0-100
  trend: TrendDirection;
  sources: string[];         // Evidence strings for transparency
}

export type StrengthRadar = Record<StrengthDimension, number>; // Simple 0-100 per dimension

export type DetailedStrengthRadar = Record<StrengthDimension, StrengthScore>;

/** How each dimension is calculated (for transparency in UI) */
export const STRENGTH_SOURCES: Record<StrengthDimension, string[]> = {
  creativity: ['Creation diversity', 'Beat the AI scores', 'Cerebro creative challenge scores'],
  language: ['MindX Speaking band', 'MindX Reading band', 'Story creation quality'],
  reasoning: ['MindX Thinking band', 'Cerebro reasoning scores', 'Quiz creation complexity'],
  aiKnowledge: ['AI concepts learned', 'AI X-Ray engagement', 'AI Points total'],
  collaboration: ['Share count', 'Community engagement', 'Peer votes received'],
  persistence: ['Streak length', 'Retry rate', 'Improvement over time', 'Session frequency'],
};

// ─── Activity Pulse ─────────────────────────────────────────

export interface ActivityPulse {
  sessionsCount: number;
  creationsCount: number;
  timeSpentMinutes: number;
  streak: { current: number; longest: number };
  activeDays: string[];      // ISO date strings (YYYY-MM-DD)
}

// ─── Interest Signals ───────────────────────────────────────

export interface InterestSignal {
  signal: string;            // Interest name (e.g., "Space & Astronomy")
  strength: number;          // 0-1 confidence score
  evidence: string;          // Human-readable evidence
  suggestion: string;        // Actionable suggestion for parents
}

import type { CreationType } from './creation.types';

export interface InterestAnalysis {
  signals: InterestSignal[];
  favoriteCreationType: CreationType;
  creationTypeDistribution: Record<CreationType, number>;
}

// ─── Koko's Report (AI-generated) ───────────────────────────

export interface GoalSuggestion {
  goal: string;
  timeframe: string;         // "4 weeks", "6 weeks"
  currentProgress: number;   // 0-1
}

export interface KokoReport {
  summary: string;           // 2-3 sentence overview
  highlights: string[];      // 3-5 key achievements this period
  parentTips: string[];      // 2-3 actionable tips for parents
  goalSuggestions: GoalSuggestion[];
  encouragement: string;     // Warm, personalized message about the child
}

// ─── Learning Progress ──────────────────────────────────────

export interface MindXBandSnapshot {
  speaking: number;          // Band 0-5 (0 = not started)
  listening: number;
  thinking: number;
  reading: number;
}

export interface CerebroResultSnapshot {
  competitionId: string;
  competitionTitle: string;
  round: number;
  score: number;
  rank: number;
  totalParticipants: number;
  advanced: boolean;
}

export interface LearningProgress {
  conceptsLearned: number;
  conceptsTotal: number;     // Grade-level target
  mindxBands: MindXBandSnapshot;
  cerebroResults: CerebroResultSnapshot[];
}

// ─── Peer Comparison (Opt-in) ───────────────────────────────

export type PeerPercentiles = Partial<Record<StrengthDimension, number>>; // Percentile 0-100

// ─── GrowthMap Report (Firestore document) ──────────────────

export type ReportPeriod = 'weekly' | 'monthly';

export interface GrowthMapReport {
  id: string;
  kidId: string;
  userId: string;            // Parent user ID
  period: ReportPeriod;
  periodStart: Date;
  periodEnd: Date;
  activityPulse: ActivityPulse;
  strengthRadar: StrengthRadar;
  interestSignals: InterestSignal[];
  learningProgress: LearningProgress;
  kokoReport: KokoReport;
  peerComparison?: PeerPercentiles; // Only if parent opted in
  previousStrengthRadar?: StrengthRadar; // For comparison arrows
  createdAt: Date;
}

// ─── API Types ──────────────────────────────────────────────

/** Response from GET /api/growth-map/dashboard */
export interface GrowthMapDashboardResponse {
  kidName: string;
  period: ReportPeriod;
  activityPulse: ActivityPulse;
  strengthRadar: StrengthRadar;
  previousStrengthRadar?: StrengthRadar;
  topInterests: InterestSignal[];    // Top 3 signals
  learningSnapshot: {
    conceptsLearned: number;
    conceptsTotal: number;
    mindxBands: MindXBandSnapshot;
  };
}

/** Response from GET /api/growth-map/report */
export type GrowthMapReportResponse = KokoReport;

/** Response from GET /api/growth-map/strengths */
export interface GrowthMapStrengthsResponse {
  radar: DetailedStrengthRadar;
  topStrength: StrengthDimension;
  growthOpportunity: StrengthDimension;
  peerPercentiles?: PeerPercentiles;
}

/** Response from GET /api/growth-map/interests */
export interface GrowthMapInterestsResponse {
  signals: InterestSignal[];
  favoriteCreationType: CreationType;
  creationTypeDistribution: Record<CreationType, number>;
}
