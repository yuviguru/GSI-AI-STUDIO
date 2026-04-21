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

/** Event type — drives stakes, phase-advance eligibility, and UI treatment.
 *
 *  - `regular`   — everyday small-stakes decision; cannot advance phase;
 *                  subject to the 5-per-in-game-day cap. Generated on
 *                  demand when the kid opens /ceo with no pending event.
 *  - `milestone` — named "TODAY'S BIG CHOICE"; big cash/reputation swings;
 *                  ONLY these advance phases. Delivered by the scheduled
 *                  daily cron (6:30am IST) or immediately on first
 *                  business registration. */
export type CeoEventType = 'regular' | 'milestone';

export type CeoChoiceId = 'A' | 'B' | 'C';

export type CeoDimensionKey =
  | 'risk_calibration'
  | 'capital_discipline'
  | 'growth_instinct'
  | 'operational_rigor'
  | 'people_leadership'
  | 'crisis_response';

export type CeoDimensionTrend = 'up' | 'down' | 'stable';

/** Simulation length in days. 15 = snappy (~1.3 milestone/day), 30 = default
 *  (~1/day), 45 = spacious with rest days between milestones. Old 30/60/90
 *  businesses in production are handled via `coerceLegacyPace()` — read code
 *  treats any non-new pace as '30' for display, math, and cron scheduling. */
export type CeoPace = '15' | '30' | '45';

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

/** Firestore document in `ceoBusiness` collection — live business simulation state.
 *
 *  Kid CEO is authenticated-only: every business belongs to an authenticated
 *  parent (`userId` = Firebase Auth UID) and a specific kid profile
 *  (`kidId` = top-level `kids/{kidId}` document). Anonymous sessionId-based
 *  ownership was retired — the web app and Telegram bot both key on
 *  `(userId, kidId)` so data syncs automatically across channels. */
export interface CeoBusiness {
  id: string;
  userId: string;
  kidId: string;
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

  // ── Regular-event daily cap + milestone-delivery tracking ─────────────
  /** Count of REGULAR events decided today (resets at UTC midnight so the
   *  reset lines up cleanly with Firestore's TTL/scheduled-function clock).
   *  Cap enforced in `/api/ceo/regular-event` + bot. */
  dailyRegularEventCount?: number;
  /** UTC-date key (`YYYY-MM-DD`) of the last regular-event decision; used
   *  to decide whether to reset `dailyRegularEventCount` above. */
  lastRegularEventDayUtc?: string;
  /** Unix millis of the last MILESTONE event generated for this business.
   *  The daily-delivery cron checks this to avoid firing a second milestone
   *  event inside the same kid-day window. */
  lastMilestoneDeliveredAt?: Timestamp | null;
}

/** Firestore document in `ceoEvents` collection — a single decision event for a business.
 *
 *  `userId` + `kidId` are denormalized from the parent business so we can
 *  query events by kid without an extra join.
 *
 *  Two flavours of event (`eventType`):
 *    - `regular`   — small-stakes, on-demand, capped 5/day, no phase advance.
 *    - `milestone` — "TODAY'S BIG CHOICE", named + dated, big cash/rep
 *                    swings, the ONLY thing that advances phases. Delivered
 *                    by the daily cron at 6:30am IST. */
export interface CeoEvent {
  id: string;
  businessId: string;
  userId: string;
  kidId: string;
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

  // ── Regular vs milestone differentiation (PR2) ────────────────────────
  /** Event flavour. Older events (pre-refactor) without this field should
   *  be treated as 'milestone' if `milestone` is set, else 'regular' —
   *  see `coerceLegacyEventType()` for the read-time shim. */
  eventType?: CeoEventType;
  /** Only on milestone events. Dynamic LLM-generated headline like
   *  "The Pitch Day" / "Copycat Crisis" / "First Big Hire". Distinct from
   *  `title` (which is the kid-facing scenario label). Absent on regular
   *  events. */
  namedTitle?: string;
  /** Only on milestone events — the 6:30am IST delivery slot the cron
   *  was aiming for. Useful for analytics + the "arrives tomorrow at 7am"
   *  copy in /mybusiness. Absent on regular events. */
  scheduledFor?: Timestamp | null;
  /** Multiplier applied to cash_delta / reputation_delta / morale_delta
   *  when applying state changes. Regular = 1.0, milestone = 3.0-10.0
   *  depending on the milestone beat. Absent on legacy events → treated as
   *  1.0. */
  stakesMultiplier?: number;
}

/** Firestore document in `ceoProfiles` collection — shareable DNA Card / CEO profile snapshot. */
export interface CeoProfile {
  id: string;
  userId: string;
  kidId: string;
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
