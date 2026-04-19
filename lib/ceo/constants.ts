/** Kid CEO constants — dimensions, phase multipliers, AI Points rewards,
 *  and default capital per business type. Ported from SimPrenuer/profileEngine.js
 *  (PHASE_MULTIPLIERS, DIMENSIONS) with kid-adapted amounts. */

import type { CeoBusinessType, CeoDimensionKey, CeoPhaseKey } from '@/types';

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
 *  docs/GSI_INTEGRATION_PLAN.md §6. */
export const CEO_AI_POINTS = {
  REGISTER_BUSINESS: 15,
  MAKE_DECISION: 5,
  COMPLETE_MILESTONE: 10,
  COMPLETE_PHASE: 25,
  COMPLETE_SIMULATION: 50,
  SHARE_PROFILE: 10,
} as const;

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
