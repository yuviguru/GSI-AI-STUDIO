/** Kid CEO decision scoring. Port of the scoring half of
 *  SimPrenuer/profileEngine.js (scoreDecision + enrichScores + response-time
 *  and state-context modifiers). Unchanged logic — kids see growth-oriented
 *  feedback text, but the math that turns a choice into a DNA signal is the
 *  same three-axis enrichment as SimPrenuer:
 *
 *    1. Phase multipliers       — some dimensions matter more per phase
 *    2. Response-time signal    — speed is itself a signal, context-dependent
 *    3. State-context amplifiers — same choice reads differently when cash
 *                                   is 20% vs 150% of starting capital
 *
 *  Uses GSI's existing Groq → Claude pipeline. Falls back to the kid's own
 *  choice.weights if the LLM is unavailable. */

import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import type {
  CeoBusiness,
  CeoChoice,
  CeoChoiceId,
  CeoDimensionKey,
  CeoDimensionScores,
  CeoEvent,
} from '@/types';
import { DIMENSIONS, PHASE_MULTIPLIERS, type CeoEventCategory } from './constants';
import type { StateChanges } from './businessState';
import {
  DECISION_SCORING_PROMPT,
  buildScoringPrompt,
} from './prompts/scoringPrompt';

export interface ScoringResult {
  scores: CeoDimensionScores;
  reasoning: string;
  state_changes: StateChanges;
}

interface LlmScoringResponse {
  scores: Partial<CeoDimensionScores>;
  reasoning: string;
  state_changes?: Partial<StateChanges>;
}

interface ScoreDecisionParams {
  event: Pick<CeoEvent, 'category' | 'title' | 'description' | 'phase' | 'milestone' | 'choices'>;
  choiceId: CeoChoiceId;
  responseTimeSeconds: number;
  business: CeoBusiness;
}

/** Main entry. Tries Groq → Claude → per-choice-weights fallback. Always
 *  applies the 3-axis enrichment, even to LLM-generated scores. */
export async function scoreDecision(params: ScoreDecisionParams): Promise<ScoringResult> {
  const { event, choiceId, responseTimeSeconds, business } = params;

  const chosen = event.choices.find((c) => c.id === choiceId);
  if (!chosen) {
    throw new Error(`Invalid choiceId ${choiceId} — event has no such choice`);
  }

  const category = event.category as CeoEventCategory;

  // 1. Try Groq
  try {
    const raw = await callScoringLLM('groq', {
      event,
      choiceId,
      choiceText: chosen.text,
      responseTimeSeconds,
      business,
    });
    return finalize(raw, { phase: business.phase, responseTimeSeconds, category, business });
  } catch (groqErr) {
    console.warn('[ceo/scoringEngine] Groq failed, trying Claude:', (groqErr as Error).message);
  }

  // 2. Try Claude
  try {
    const raw = await callScoringLLM('claude', {
      event,
      choiceId,
      choiceText: chosen.text,
      responseTimeSeconds,
      business,
    });
    return finalize(raw, { phase: business.phase, responseTimeSeconds, category, business });
  } catch (claudeErr) {
    console.warn('[ceo/scoringEngine] Claude failed, using choice.weights fallback:', (claudeErr as Error).message);
  }

  // 3. Fallback: use the choice's own weights as raw scores + derive state changes heuristically
  const fallback = fallbackScoring(chosen, category);
  return finalize(fallback, { phase: business.phase, responseTimeSeconds, category, business });
}

async function callScoringLLM(
  provider: 'groq' | 'claude',
  params: Parameters<typeof buildScoringPrompt>[0],
): Promise<LlmScoringResponse> {
  const userPrompt = buildScoringPrompt(params);
  const opts = {
    systemPrompt: DECISION_SCORING_PROMPT,
    userMessage: userPrompt,
    temperature: 0.3,
    maxTokens: 800,
  };
  const result =
    provider === 'groq'
      ? await generateJsonWithGroq<LlmScoringResponse>(opts)
      : await generateJsonWithClaude<LlmScoringResponse>(opts);

  if (!result?.scores || !result?.reasoning) {
    throw new Error('Invalid scoring structure from LLM');
  }
  return result;
}

/** Apply the 3-axis enrichment and return a normalized ScoringResult. */
function finalize(
  raw: LlmScoringResponse,
  ctx: {
    phase: CeoBusiness['phase'];
    responseTimeSeconds: number;
    category: CeoEventCategory;
    business: CeoBusiness;
  },
): ScoringResult {
  const enrichedScores = enrichScores(raw.scores, ctx);

  return {
    scores: enrichedScores,
    reasoning: (raw.reasoning || '').trim(),
    state_changes: normalizeStateChanges(raw.state_changes, enrichedScores),
  };
}

/** Apply phase × state-context multipliers and response-time adjustments.
 *  Clamps each dimension to [-10, +10], rounds to 1 decimal. */
export function enrichScores(
  rawScores: Partial<CeoDimensionScores>,
  ctx: {
    phase: CeoBusiness['phase'];
    responseTimeSeconds: number;
    category: CeoEventCategory;
    business: CeoBusiness;
  },
): CeoDimensionScores {
  const phaseMults = PHASE_MULTIPLIERS[ctx.phase];
  const stateMults = stateContextMultipliers(ctx.business);
  const timeAdj = responseTimeAdjustments(ctx.responseTimeSeconds, ctx.category);

  const enriched = {} as CeoDimensionScores;
  for (const dim of DIMENSIONS) {
    let value = Number(rawScores[dim] ?? 0);
    value *= phaseMults[dim] ?? 1.0;
    value *= stateMults[dim] ?? 1.0;
    value += timeAdj[dim] ?? 0;
    enriched[dim] = Math.round(Math.max(-10, Math.min(10, value)) * 10) / 10;
  }
  return enriched;
}

/** Response-speed is itself a signal — but the meaning depends on the
 *  event category. Direct port from SimPrenuer/profileEngine.js. */
function responseTimeAdjustments(
  responseTimeSeconds: number,
  category: CeoEventCategory,
): Partial<Record<CeoDimensionKey, number>> {
  const adj: Partial<Record<CeoDimensionKey, number>> = {};

  if (responseTimeSeconds < 15) {
    if (category === 'crisis') {
      adj.crisis_response = 1;
    } else if (category === 'capital' || category === 'risk') {
      adj.risk_calibration = -1;
      adj.operational_rigor = -1;
    }
  } else if (responseTimeSeconds >= 30 && responseTimeSeconds <= 120) {
    adj.risk_calibration = 0.5;
  } else if (responseTimeSeconds > 300) {
    if (category === 'crisis') {
      adj.crisis_response = -2;
    } else {
      adj.crisis_response = -0.5;
    }
  }

  return adj;
}

/** The same choice means different things in different business states.
 *  Kid-scale rewrite of SimPrenuer's stateContextMultipliers. */
function stateContextMultipliers(business: CeoBusiness): Partial<Record<CeoDimensionKey, number>> {
  const cashRatio = business.startingCapital > 0 ? business.currentCash / business.startingCapital : 1;
  const multipliers: Partial<Record<CeoDimensionKey, number>> = {};

  if (cashRatio < 0.2) {
    multipliers.capital_discipline = 1.5;
    multipliers.risk_calibration = 1.4;
  } else if (cashRatio > 1.5) {
    multipliers.capital_discipline = 0.8;
    multipliers.growth_instinct = 1.3;
  }

  if (business.reputation < 30) {
    multipliers.people_leadership = 1.4;
    multipliers.crisis_response = 1.3;
  }

  if (business.morale < 25) {
    const existing = multipliers.people_leadership ?? 1.0;
    multipliers.people_leadership = Math.max(existing, 1.5);
  }

  return multipliers;
}

/** Derive sensible default state-changes when the LLM didn't return any or
 *  when we're in pure-fallback mode. Kid-scale numbers. */
function normalizeStateChanges(
  raw: Partial<StateChanges> | undefined,
  scores: CeoDimensionScores,
): StateChanges {
  const netScore = DIMENSIONS.reduce((sum, d) => sum + scores[d], 0);
  const isAggressive = netScore > 2;
  const isConservative = netScore < -1;

  return {
    cash_delta: clampCashDelta(raw?.cash_delta, isAggressive ? -150 : isConservative ? 75 : -40),
    reputation_delta: clampSmall(
      raw?.reputation_delta,
      scores.people_leadership > 0 ? 2 : scores.crisis_response < 0 ? -2 : 0,
    ),
    morale_delta: clampSmall(raw?.morale_delta, Math.round(scores.people_leadership) || 0),
    customer_satisfaction_delta: clampSmall(raw?.customer_satisfaction_delta, Math.round(scores.crisis_response) || 0),
    revenue_delta: Number.isFinite(raw?.revenue_delta) ? (raw!.revenue_delta as number) : 0,
    expenses_delta: Number.isFinite(raw?.expenses_delta) ? (raw!.expenses_delta as number) : 0,
  };
}

function clampCashDelta(raw: number | undefined, fallback: number): number {
  const v = Number.isFinite(raw) ? (raw as number) : fallback;
  return Math.max(-2000, Math.min(2000, Math.round(v)));
}

function clampSmall(raw: number | undefined, fallback: number): number {
  const v = Number.isFinite(raw) ? (raw as number) : fallback;
  return Math.max(-10, Math.min(10, Math.round(v)));
}

/** Used when both LLM providers fail. Produces a reasonable scoring result
 *  from the kid's chosen choice's own weights. Reasoning text is kept
 *  generic + growth-oriented. */
function fallbackScoring(chosen: CeoChoice, category: CeoEventCategory): LlmScoringResponse {
  const raw: Partial<CeoDimensionScores> = {};
  for (const [dim, w] of Object.entries(chosen.weights) as [CeoDimensionKey, number][]) {
    raw[dim] = w;
  }

  return {
    scores: raw,
    reasoning: `Picking this shows a clear pattern in a ${category} moment. We'll watch how it plays out and build on it.`,
    state_changes: {},
  };
}
