/** Kid CEO constants — dimensions, phase multipliers, AI Points rewards,
 *  and default capital per business type. Ported from SimPrenuer/profileEngine.js
 *  (PHASE_MULTIPLIERS, DIMENSIONS) with kid-adapted amounts. */

import type { CeoBusinessType, CeoDimensionKey, CeoPace, CeoPhaseKey } from '@gsi/types';

export const DIMENSIONS: readonly CeoDimensionKey[] = [
  'risk_calibration',
  'capital_discipline',
  'growth_instinct',
  'operational_rigor',
  'people_leadership',
  'crisis_response',
] as const;

/** Kid-facing labels — used in UI, CEO Profile Card, Koko feedback. */
export const DIMENSION_LABELS: Record<CeoDimensionKey, { name: string; description: string }> = {
  risk_calibration: {
    name: 'Bold Moves',
    description: 'Do you take smart chances or play it safe?',
  },
  capital_discipline: {
    name: 'Money Smarts',
    description: 'Do you spend wisely or blow your budget?',
  },
  growth_instinct: {
    name: 'Big Dreams',
    description: 'Do you think big or stay small?',
  },
  operational_rigor: {
    name: 'Getting It Done',
    description: 'Are you organised or all over the place?',
  },
  people_leadership: {
    name: 'Team Captain',
    description: 'Do you inspire people or go solo?',
  },
  crisis_response: {
    name: 'Cool Under Pressure',
    description: 'Do you stay calm when things go wrong?',
  },
};

/** Kid-facing phase labels. The keys stay the SimPrenuer names so ported logic
 *  works unchanged; labels are softer for kids. */
export const PHASE_LABELS: Record<CeoPhaseKey, string> = {
  pre_launch: 'Getting Ready',
  launch: 'Opening Day',
  early_growth: 'Growing Up',
  scale: 'Going Big',
  mature: 'Running the Show',
};

/** Phase-aware scoring multipliers (direct port from SimPrenuer/profileEngine.js).
 *  Certain dimensions matter MORE during certain phases — amplifies signal where
 *  it's most diagnostic. */
export const PHASE_MULTIPLIERS: Record<CeoPhaseKey, Record<CeoDimensionKey, number>> = {
  pre_launch: {
    risk_calibration: 1.4,
    capital_discipline: 1.3,
    growth_instinct: 1.0,
    operational_rigor: 0.8,
    people_leadership: 1.0,
    crisis_response: 0.7,
  },
  launch: {
    risk_calibration: 1.0,
    capital_discipline: 1.0,
    growth_instinct: 1.4,
    operational_rigor: 1.3,
    people_leadership: 1.0,
    crisis_response: 1.2,
  },
  early_growth: {
    risk_calibration: 1.0,
    capital_discipline: 1.0,
    growth_instinct: 1.2,
    operational_rigor: 1.0,
    people_leadership: 1.4,
    crisis_response: 1.0,
  },
  scale: {
    risk_calibration: 1.2,
    capital_discipline: 1.3,
    growth_instinct: 1.0,
    operational_rigor: 1.4,
    people_leadership: 1.2,
    crisis_response: 1.0,
  },
  mature: {
    risk_calibration: 1.0,
    capital_discipline: 1.0,
    growth_instinct: 0.8,
    operational_rigor: 1.0,
    people_leadership: 1.3,
    crisis_response: 1.4,
  },
};

/** Kid business types → starting capital in rupees. Kid-appropriate amounts
 *  (pocket money scale, not lakhs). "custom" defaults to 500. */
export const STARTING_CAPITAL: Record<CeoBusinessType, number> = {
  lemonade: 300,
  icecream: 800,
  tshirt: 1500,
  games: 500,
  crafts: 400,
  blog: 200,
  custom: 500,
};

/** Kid-facing business names — used as defaults when kid doesn't pick a name. */
export const BUSINESS_TYPE_DEFAULT_NAMES: Record<CeoBusinessType, string> = {
  lemonade: 'Lemonade Stand',
  icecream: 'Ice Cream Parlour',
  tshirt: 'T-Shirt Shop',
  games: 'Game Studio',
  crafts: 'Craft Shop',
  blog: 'School Blog',
  custom: 'My Business',
};

/** AI Points awarded by Kid CEO actions. Matches the table in
 *  docs/GSI_INTEGRATION_PLAN.md §6.
 *
 *  MAKE_DECISION_REGULAR is smaller than MAKE_DECISION_MILESTONE on
 *  purpose — milestone events are the "big moments" and the points award
 *  should reflect that. Totals roughly match the old flat 5/decision rate
 *  when you count both event types at typical 1-milestone + 2-regular/day. */
export const CEO_AI_POINTS = {
  REGISTER_BUSINESS: 15,
  MAKE_DECISION_REGULAR: 3,
  MAKE_DECISION_MILESTONE: 10,
  /** @deprecated kept for transition to avoid breaking imports; aliases MAKE_DECISION_REGULAR. */
  MAKE_DECISION: 3,
  COMPLETE_MILESTONE: 10,
  COMPLETE_PHASE: 25,
  COMPLETE_SIMULATION: 50,
  SHARE_PROFILE: 10,
} as const;

// ─── Pace (simulation length) ────────────────────────────────────────────

/** In-game days per pace option. These are the NEW shorter paces — the old
 *  30/60/90 options are gone from the picker but tolerated on reads via
 *  `coerceLegacyPace`. */
export const PACE_DAYS: Record<CeoPace, number> = {
  '15': 15,
  '30': 30,
  '45': 45,
};

/** How many milestone events to deliver per calendar day, keyed by pace.
 *  Tuned so the total ≈ the milestone count (currently 20 across all 5
 *  phases) — faster paces compress with multiple milestone events some days,
 *  slower paces spread with rest days between. */
export const MILESTONE_EVENTS_PER_DAY: Record<CeoPace, number> = {
  '15': 1.3,
  '30': 0.7,
  '45': 0.5,
};

/** Daily cap on REGULAR events. Regular events never advance phase, they
 *  just let the kid fiddle with their business between milestone beats. */
export const REGULAR_EVENTS_PER_DAY_CAP = 5;

/** Map any pace value stored in Firestore (including legacy 30/60/90 docs
 *  created before the pace change) down to one of the new `CeoPace` values.
 *  Used for rendering + cron scheduling so old businesses keep working. */
export function coerceLegacyPace(raw: string | number | null | undefined): CeoPace {
  const s = String(raw ?? '').trim();
  if (s === '15') return '15';
  if (s === '30') return '30';
  if (s === '45') return '45';
  // Legacy: 60 was the middle option, now 30 is. 90 was the longest, now 45 is.
  if (s === '60') return '30';
  if (s === '90') return '45';
  return '30'; // unknown / missing → default
}

// ─── Stakes multipliers ──────────────────────────────────────────────────

/** Stakes multiplier range per event type. Applied to cash_delta /
 *  reputation_delta / morale_delta after scoring. A regular event scoring
 *  "bold aggressive" → ~₹150 cash swing; the same call on a milestone
 *  event → ~₹1,500. The LLM is also told the range when generating so
 *  milestone prompts ask for bigger deltas. */
export const STAKES_MULTIPLIER = {
  regular: 1.0,
  /** Minimum milestone multiplier — early milestones in pre_launch feel
   *  consequential but not business-ending. */
  milestoneMin: 3.0,
  /** Max multiplier — reserved for phase-changing milestone beats
   *  (e.g. OPENING_STRATEGY, COMPETITION, STRATEGIC_PIVOT) where a
   *  wrong call should meaningfully hurt. */
  milestoneMax: 10.0,
} as const;

/** Default milestone multiplier when no specific beat-override applies.
 *  5× is the mid of the 3×–10× range — strong but survivable. */
export const DEFAULT_MILESTONE_MULTIPLIER = 5.0;

/** Per-milestone stakes override. Milestones that mark phase transitions
 *  or make-or-break moments get higher multipliers so kids FEEL them.
 *  Anything not listed falls back to DEFAULT_MILESTONE_MULTIPLIER. */
export const MILESTONE_STAKES_MULTIPLIER: Record<string, number> = {
  // pre_launch — picking a path, not stakes yet
  BRAND: 3,
  LOCATION: 3,
  INITIAL_TEAM: 4,
  PRICING: 5,
  FUNDING_STANCE: 6,
  // launch — first real money moves
  OPENING_STRATEGY: 8,
  OPERATIONS_SETUP: 4,
  FIRST_CUSTOMERS: 7,
  EARLY_FEEDBACK: 6,
  // early_growth — retention makes/breaks
  RETENTION: 7,
  FIRST_HIRE: 6,
  SUPPLIER_RELATIONSHIP: 5,
  WORD_OF_MOUTH: 6,
  // scale — big swings
  EXPANSION: 9,
  COMPETITION: 10,
  TEAM_GROWTH: 6,
  CAPITAL_STRATEGY: 9,
  // mature — defining decisions
  STRATEGIC_PIVOT: 10,
  LEGACY: 6,
  EXIT_STRATEGY: 10,
};

/** Resolve the stakes multiplier for a milestone name with a safe default. */
export function stakesMultiplierFor(milestone: string | null): number {
  if (!milestone) return STAKES_MULTIPLIER.regular;
  return MILESTONE_STAKES_MULTIPLIER[milestone] ?? DEFAULT_MILESTONE_MULTIPLIER;
}

/** Categories a Kid CEO event can fall into (same as SimPrenuer). */
export const CEO_EVENT_CATEGORIES = [
  'capital',
  'growth',
  'operations',
  'people',
  'risk',
  'crisis',
] as const;

export type CeoEventCategory = (typeof CEO_EVENT_CATEGORIES)[number];

/** Milestone → natural category fallback (port from SimPrenuer/eventEngine.js
 *  MILESTONE_FALLBACK_CATEGORY). Used when the LLM is unavailable and we pick
 *  a template event whose category matches the target milestone. */
export const MILESTONE_FALLBACK_CATEGORY: Record<string, CeoEventCategory> = {
  BRAND: 'growth',
  LOCATION: 'operations',
  INITIAL_TEAM: 'people',
  PRICING: 'capital',
  FUNDING_STANCE: 'capital',
  OPENING_STRATEGY: 'growth',
  FIRST_CUSTOMERS: 'growth',
  OPERATIONS_SETUP: 'operations',
  EARLY_FEEDBACK: 'crisis',
  RETENTION: 'people',
  FIRST_HIRE: 'people',
  SUPPLIER_RELATIONSHIP: 'operations',
  WORD_OF_MOUTH: 'growth',
  EXPANSION: 'growth',
  COMPETITION: 'risk',
  TEAM_GROWTH: 'people',
  CAPITAL_STRATEGY: 'capital',
  STRATEGIC_PIVOT: 'risk',
  LEGACY: 'people',
  EXIT_STRATEGY: 'capital',
};
