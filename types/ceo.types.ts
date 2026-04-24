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

// ─── Agents (Phase 3) ──────────────────────────────────────

/** The six agent archetypes kids hire to handle parts of their business.
 *  Static catalog lives in `lib/ceo/agents/catalog.ts` — NOT Firestore. */
export type CeoAgentId =
  | 'design'
  | 'marketing'
  | 'ops'
  | 'finance'
  | 'customer_success'
  | 'product';

export type CeoAgentHireStatus = 'active' | 'paused' | 'dismissed';

export type CeoAgentAggressiveness = 'low' | 'medium' | 'high';

/** Catalog descriptor. Non-persistent — resolved from code at read time. */
export interface CeoAgentDescriptor {
  id: CeoAgentId;
  name: string;
  emoji: string;
  /** Short kid-facing tagline shown on the hire card. */
  tagline: string;
  /** Phase the kid must reach before this agent becomes hireable. */
  unlockPhase: CeoPhaseKey;
  /** Daily salary in in-sim rupees, deducted at the IST midnight tick. */
  salaryPerDay: number;
  /** Kid-facing focus options (first is the default). Each focus maps to
   *  a different system prompt when the agent runs a workflow. */
  focusOptions: ReadonlyArray<{ id: string; name: string; description: string }>;
  /** Workflows this agent can run. IDs resolved via WORKFLOW_REGISTRY. */
  workflows: ReadonlyArray<CeoWorkflowId>;
}

export interface CeoAgentConfig {
  focus: string; // must be one of descriptor.focusOptions[].id
  aggressiveness: CeoAgentAggressiveness;
}

/** Firestore doc in `ceoAgentHires` — each document is one kid's hire of
 *  one agent for one business. */
export interface CeoAgentHire {
  id: string;
  userId: string;
  kidId: string;
  businessId: string;
  agentId: CeoAgentId;
  config: CeoAgentConfig;
  salary: number;
  status: CeoAgentHireStatus;
  hiredAt: Timestamp;
  updatedAt: Timestamp;
}

/** Workflow IDs (closed union). Each is a dot-namespaced string so the
 *  registry can lazily resolve the matching `WorkflowSpec`. Specific
 *  workflows are introduced by per-agent stories. */
export type CeoWorkflowId =
  | 'brand.package'
  | 'marketing.firstCampaign'
  | 'marketing.dailyPush'
  | 'ops.setupPackage'
  | 'ops.scheduleCheck'
  | 'finance.pricingPackage'
  | 'finance.cashCheck';

/** Trigger source for an artifact — where the workflow run came from. */
export type CeoArtifactTrigger =
  | 'milestone'
  | 'regular'
  | 'manual'
  | 'custom_workflow';

export type CeoArtifactStatus = 'candidate' | 'accepted' | 'rejected' | 'expired';

/** One step of a workflow trace. Populated by the executor as each tool
 *  call resolves. Kid-visible via the `<WorkflowTrace>` X-ray panel. */
export interface CeoWorkflowStepTrace {
  /** Step identifier as declared in the WorkflowSpec (e.g. `logo_candidates`). */
  stepId: string;
  /** Tool adapter name (e.g. `flux_schnell`, `claude_haiku`, `break_even`). */
  tool: string;
  /** Model identifier as reported by the underlying provider (e.g.
   *  `black-forest-labs/FLUX.1-schnell`, `claude-haiku-4.5`). Empty for
   *  deterministic tools. */
  model: string;
  promptTokens: number;
  completionTokens: number;
  /** In-sim rupees charged for this step (from
   *  `lib/ceo/agents/pricing.ts`). */
  costInr: number;
  inputSummary: string;
  outputSummary: string;
  latencyMs: number;
  /** When a tool retried once on a transient error, this is the attempt
   *  count that actually succeeded (2 = first retry succeeded). */
  attemptCount?: number;
  /** If set, the step failed. `outputSummary` holds the error message. */
  failed?: boolean;
}

/** Polymorphic artifact asset — discriminated union by `type`. */
export type CeoArtifactAsset =
  | CeoArtifactImageAsset
  | CeoArtifactTextAsset
  | CeoArtifactPaletteAsset
  | CeoArtifactScheduleAsset
  | CeoArtifactPricingStrategyAsset;

export interface CeoArtifactImageAsset {
  type: 'image';
  /** Kid-facing kind hint used for UI grouping / copy. */
  kind: 'logo' | 'poster' | 'other';
  url: string;
  caption: string;
  altText: string;
  widthPx: number;
  heightPx: number;
}

export interface CeoArtifactTextAsset {
  type: 'text';
  kind: 'motto' | 'voice' | 'post' | 'checklist' | 'rationale' | 'hours_plan' | 'role_card' | 'other';
  content: string;
}

export interface CeoArtifactPaletteAsset {
  type: 'palette';
  colors: string[]; // hex, e.g. "#FF8800"
}

export interface CeoArtifactScheduleAsset {
  type: 'schedule';
  days: ReadonlyArray<{
    day: string; // e.g. "Mon"
    open: string; // "HH:mm"
    close: string; // "HH:mm"
    notes: string;
  }>;
}

export interface CeoArtifactPricingStrategyAsset {
  type: 'pricing_strategy';
  price: number;
  rationale: string;
  breakEvenUnits: number;
}

/** Firestore doc in `ceoArtifacts`. One per workflow run — candidate
 *  until the kid accepts or rejects. */
export interface CeoArtifact {
  id: string;
  userId: string;
  kidId: string;
  businessId: string;
  agentHireId: string;
  workflowId: CeoWorkflowId;
  trigger: CeoArtifactTrigger;
  trace: CeoWorkflowStepTrace[];
  assets: CeoArtifactAsset[];
  status: CeoArtifactStatus;
  /** Which event this run is resolving (milestone or regular), if any. */
  decisionEventId?: string | null;
  /** Where the accepted artifact ultimately landed. Populated on accept. */
  attachedTo?:
    | { kind: 'business_field'; field: 'brandAssets' }
    | { kind: 'event'; eventId: string }
    | { kind: 'marketing_feed' }
    | null;
  /** Estimated total LLM + image-model cost in in-sim ₹. Deducted from
   *  `business.currentCash` when this artifact was minted. */
  costInr: number;
  /** 1-indexed count of attempts in the current session (resets on
   *  accept/reject). Used by the re-roll escalation multiplier. */
  runIndex: number;
  createdAt: Timestamp;
  acceptedAt?: Timestamp | null;
}

/** Set on `business.brandAssets` once the BRAND milestone resolves via
 *  the Design Agent. Referenced in every subsequent event prompt so the
 *  arc coheres around the kid's brand identity. */
export interface CeoBrandAssets {
  logoUrl: string;
  motto: string;
  voice: string;
  palette?: string[];
}

// ─── Custom workflows (Scale-phase Workflow Builder) ──────────

/** Closed vocabulary of triggers a custom workflow can listen for.
 *  Decision W3 locks this as a 8-value enum — open-ended triggers
 *  would create a prompt-injection surface the Scale-phase kid isn't
 *  equipped to vet. */
export type CeoCustomTrigger =
  | 'negative_customer_feedback'
  | 'positive_customer_feedback'
  | 'cash_below_threshold'
  | 'cash_above_threshold'
  | 'reputation_below_threshold'
  | 'new_phase_reached'
  | 'milestone_missed'
  | 'end_of_day';

/** Firestore doc in `ceoCustomWorkflows`. One per "recipe" a kid has
 *  built. Matches the CONTEXT of phase 3's KIDCEO-WORKFLOW-BUILDER
 *  story — simple IF-trigger THEN-agent-run-workflow pairing; the
 *  full drag-drop React Flow canvas is deferred behind this minimum-
 *  viable shape. */
export interface CeoCustomWorkflow {
  id: string;
  userId: string;
  kidId: string;
  businessId: string;
  /** Kid-facing name, e.g. "If customers complain, have Marketing
   *  post an apology". */
  name: string;
  trigger: CeoCustomTrigger;
  /** Optional numeric threshold for triggers that gate on a value
   *  (cash_below_threshold ₹500, reputation_below_threshold 40, …). */
  triggerThreshold?: number;
  /** The agent + workflow to run when the trigger fires. */
  agentId: CeoAgentId;
  workflowId: CeoWorkflowId;
  /** Whether the recipe is currently armed. Kids can pause / resume
   *  without deleting. */
  enabled: boolean;
  /** Count of times this recipe has fired since creation. Surfaced
   *  in the UI so kids see their automations actually working. */
  firedCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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
  /** Count of REGULAR events decided today (resets at IST midnight per
   *  Phase 3 Daily Rhythm decision D2). Cap enforced in
   *  `/api/ceo/event` + bot. */
  dailyRegularEventCount?: number;
  /** IST-date key (`YYYY-MM-DD`, Asia/Kolkata) of the last regular-event
   *  decision. Used to decide whether to reset `dailyRegularEventCount`.
   *  Named `…Utc` for historical reasons; now stores the IST day per D2. */
  lastRegularEventDayUtc?: string;
  /** Timestamp of the last MILESTONE event generated for this business.
   *  The daily-delivery cron checks this to avoid double-firing on the
   *  same IST day. */
  lastMilestoneDeliveredAt?: Timestamp | null;

  /** Phase 3 — accepted artifact from the Design Agent after the BRAND
   *  milestone resolves. Referenced in every subsequent event prompt so
   *  the arc stays coherent around the kid's brand identity. */
  brandAssets?: CeoBrandAssets | null;

  /** Count of Marketing "Post this" actions executed today (IST). Used
   *  to enforce the C2 daily cap (+3 reputation / IST day across all
   *  posts). Reset alongside `dailyRegularEventCount`. */
  marketingDailyPostCount?: number;
  /** IST day key of the last marketing post action (same scheme as
   *  `lastRegularEventDayUtc`). */
  marketingLastPostDayUtc?: string;

  // ── Phase 3 Daily Rhythm: dual pending slots + scheduled milestone ────
  /** Current pending MILESTONE event, or null. Set by saveCeoEvent when
   *  an `eventType === 'milestone'` event is minted; cleared atomically
   *  by recordEventDecision on decide or by expireStaleMilestone when
   *  the next daily tick finds an un-answered stale milestone. */
  pendingMilestoneEventId?: string | null;
  /** Current pending REGULAR event, or null. Set when a regular is minted
   *  (either auto-chained after another regular, or pulled by the kid);
   *  cleared on decide. Coexists with pendingMilestoneEventId — they
   *  never block each other. */
  pendingRegularEventId?: string | null;
  /** When the fixed-hour delivery cron should next mint a milestone.
   *  Set to the next 18:30 IST tick after register or the last delivery.
   *  Drives the `status + nextMilestoneScheduledAt` composite index. */
  nextMilestoneScheduledAt?: Timestamp | null;
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
  /** Phase 3 — when set, the web UI renders the AgentEventCard (briefing
   *  + workflow + candidate review) instead of the legacy A/B/C picker.
   *  Current values: `'brand.package'` for BRAND milestones. Absent on
   *  all regular events and on milestones still on the legacy path. */
  agentWorkflowId?: string;
}

/** Firestore document in `ceoProfiles` collection — shareable DNA Card / CEO profile snapshot.
 *
 *  The `ending` block is populated once at simulation completion (status →
 *  'completed' in decide route) by `generateEndingReport()`. It's absent
 *  on in-flight profiles. All fields are optional to make legacy profiles
 *  (created before the ending report was added) still render. */
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

  /** Ending report — generated on simulation completion. Absent on
   *  profiles whose business is still `active`. See generateEndingReport()
   *  in `lib/ceo/endingReport.ts`. */
  ending?: CeoEndingReport;
}

// ─── Ending report (PR3) ───────────────────────────────────

/** One fictional advisor speaking directly to the kid. Persona is picked
 *  by the LLM to echo the kid's pattern (e.g. "cautious thinker" archetype
 *  → an advisor who's also cautious and reassuring). */
export interface CeoAdvisor {
  /** Fictional first name + short role, e.g. "Priya, your auntie-who-runs-a-bakery". */
  name: string;
  /** Voice/tone cue for UI styling. "warm" uses soft colours; "sharp" uses
   *  punchier typography. Cosmetic only. */
  tone: 'warm' | 'sharp' | 'playful';
  /** 2-3 sentence specific piece of advice, kid-readable. */
  advice: string;
}

/** One moment in the simulation that really mattered — large cash/rep
 *  swing. Computed from event history, then LLM writes the takeaway. */
export interface CeoDramaticMoment {
  eventId: string;
  /** namedTitle for milestone events; title for regulars. */
  headline: string;
  /** Plain-English recap, 1-2 sentences. */
  whatHappened: string;
  /** What this kid can take from that moment, 1 sentence. */
  takeaway: string;
  /** Cash swing in rupees (signed). */
  cashDelta: number;
  /** Reputation swing (signed). */
  reputationDelta: number;
}

/** Real-world founder archetype this kid's pattern most closely matches.
 *  NOT a specific named person (kid-safety — no real brand names). */
export interface CeoRealWorldParallel {
  /** e.g. "the neighbourhood-first founder" / "the relentless optimizer". */
  archetype: string;
  /** 1-2 sentence description of the type of real-world business this
   *  archetype runs (generic, never a named company). */
  parallel: string;
  /** Practical 1-sentence takeaway for a kid. */
  takeaway: string;
}

/** The "your style" snapshot — top 3 strengths, bottom 2 growth areas,
 *  plus the patterns that emerged over the simulation. */
export interface CeoStyleSnapshot {
  /** Top-3 strengths from dimensions (kid-facing labels, e.g. "Bold Moves"). */
  strengths: string[];
  /** Bottom-2 growth areas (kid-facing labels). */
  growthAreas: string[];
  /** One-sentence "what you tended to do" — patterns across decisions. */
  yourTendency: string;
  /** One-sentence "what you tended to skip/avoid" — the complementary side. */
  blindSpot: string;
}

export interface CeoEndingReport {
  /** How the simulation actually ended — kid-facing recap, 2-3 sentences. */
  howItEnded: string;
  style: CeoStyleSnapshot;
  /** 2-3 fictional advisors echoing the kid's profile archetype. */
  advisors: CeoAdvisor[];
  /** Top 3 biggest-impact moments across the whole simulation. */
  dramaticMoments: CeoDramaticMoment[];
  /** 1-2 real-world founder archetypes this profile matches. */
  parallels: CeoRealWorldParallel[];
  /** When the report was computed. Lets UI show "generated X days ago" if
   *  the kid re-opens an old profile. */
  generatedAt: Timestamp;
}
