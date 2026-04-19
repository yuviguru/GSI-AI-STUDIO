/** Kid CEO types — business simulation feature (age 10+) with event-driven decisions,
 *  phase progression, and six-dimension CEO profile / DNA Card. */

/** Local Timestamp alias — avoids a firebase-admin dependency in the types layer.
 *  Covers both serialized (string, e.g. ISO) and Firestore admin Timestamp shapes.
 *  Not exported: kept file-local to avoid barrel-export collision with bot.types.ts. */
type Timestamp = { seconds: number; nanoseconds: number } | string;

// ─── Primitive Unions ──────────────────────────────────────

export type CeoBusinessType =
  | 'lemonade'
  | 'icecream'
  | 'tshirt'
  | 'games'
  | 'crafts'
  | 'blog'
  | 'custom';

export type CeoBusinessStatus = 'active' | 'completed' | 'paused';

export type CeoPhaseKey =
  | 'pre_launch'
  | 'launch'
  | 'early_growth'
  | 'scale'
  | 'mature';

export type CeoEventStatus = 'pending' | 'decided' | 'expired';

export type CeoChoiceId = 'A' | 'B' | 'C';

export type CeoDimensionKey =
  | 'risk_calibration'
  | 'capital_discipline'
  | 'growth_instinct'
  | 'operational_rigor'
  | 'people_leadership'
  | 'crisis_response';

export type CeoDimensionTrend = 'up' | 'down' | 'stable';

export type CeoPace = '30' | '60' | '90';

export type CeoMilestoneStatus = 'pending' | 'resolved';

export type CeoDeliveryChannel = 'web' | 'telegram';

// ─── Events & Choices ──────────────────────────────────────

export interface CeoChoice {
  id: CeoChoiceId;
  text: string;
  scoring_hint: string;
  weights: Partial<Record<CeoDimensionKey, number>>;
}

/** Scores per dimension — partial since only dimensions touched by the choice are scored. */
export type CeoDimensionScores = Record<CeoDimensionKey, number>;

// ─── CEO Profile Dimensions ────────────────────────────────

export interface CeoDimensionData {
  score: number;
  decisions: number;
  trend: CeoDimensionTrend;
}

// ─── Firestore documents ───────────────────────────────────

/** Firestore document in `ceoBusiness` collection — live business simulation state. */
export interface CeoBusiness {
  id: string;
  sessionId: string;
  userId: string | null;
  kidId: string | null;
  businessName: string;
  businessType: CeoBusinessType;
  customBusinessDescription: string | null;
  location: string;
  startingCapital: number;
  currentCash: number;
  reputation: number;        // 0-100
  morale: number;            // 0-100
  employees: number;
  phase: CeoPhaseKey;
  phaseMilestones: Record<string, CeoMilestoneStatus>;
  totalDecisions: number;
  status: CeoBusinessStatus;
  pace: CeoPace;
  nextEventAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
}

/** Firestore document in `ceoEvents` collection — a single decision event for a business. */
export interface CeoEvent {
  id: string;
  businessId: string;
  sessionId: string;
  title: string;
  description: string;
  category: string;
  phase: CeoPhaseKey;
  milestone: string | null;
  choices: CeoChoice[];
  status: CeoEventStatus;
  decidedChoice: CeoChoiceId | null;
  decisionTimestamp: Timestamp | null;
  responseTimeSeconds: number | null;
  scores: Partial<CeoDimensionScores> | null;
  feedback: string | null;
  deliveredVia: CeoDeliveryChannel | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

/** Firestore document in `ceoProfiles` collection — shareable DNA Card / CEO profile snapshot. */
export interface CeoProfile {
  id: string;
  sessionId: string;
  userId: string | null;
  kidId: string | null;
  businessId: string;
  dimensions: Record<CeoDimensionKey, CeoDimensionData>;
  totalDecisions: number;
  avgResponseTime: number;
  currentPhase: CeoPhaseKey;
  shareUrl: string;
  isPublic: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
