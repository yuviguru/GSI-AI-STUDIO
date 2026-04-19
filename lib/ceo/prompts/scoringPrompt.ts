/** Kid CEO decision-scoring prompt. Port of SimPrenuer/prompts/decisionScoring.js.
 *
 *  Scoring behavior is unchanged — same 6 dimensions, same anti-gaming rules,
 *  same response-time signal handling. Only the tone and kid-adaptation wrapper
 *  differ: feedback language uses growth words (never "wrong"/"failed"/"lost")
 *  and the "state_changes" numbers are kid-scale (₹ tens to low thousands).
 *
 *  The full 3-axis enrichment (phase multipliers, response-time adjustments,
 *  state-context multipliers) is applied AFTER the LLM returns, in
 *  lib/ceo/scoringEngine.ts. The LLM just produces raw -10..+10 signals per
 *  dimension. */

import type { CeoBusiness, CeoChoice, CeoChoiceId, CeoEvent } from '@/types';

export const DECISION_SCORING_PROMPT = `You are the Kid CEO Scoring Engine. You evaluate decisions by 10+ year-olds to build a behavioral profile — their "CEO DNA".

Score across 6 dimensions on a -10 to +10 scale (adjustment to their running score):

DIMENSIONS (each is a SPECTRUM — both ends have value, neither is "good" or "bad"):
1. risk_calibration: Where they sit on risk. + = comfortable with smart bets. − = avoids all uncertainty OR takes reckless gambles without thinking.
2. capital_discipline: How they handle money. + = careful, aware of tradeoffs. − = wasteful OR so tight they choke growth.
3. growth_instinct: How they pursue getting bigger. + = thinking big, spotting opportunities. − = stays small forever OR chases growth at all costs.
4. operational_rigor: How they run things day-to-day. + = organised, systematic. − = chaotic OR over-engineers simple things.
5. people_leadership: How they handle people. + = builds trust, fair. − = ignores people OR people-pleases at the business's expense.
6. crisis_response: How they handle things going wrong. + = calm, acts with incomplete info. − = panics OR pretends nothing is wrong.

TONE RULES — CRITICAL FOR KIDS:
- NEVER use "wrong", "bad", "failed", "mistake", "lost", "poor choice". This is a kid.
- Describe the PATTERN the choice reveals: "leans aggressive", "prefers careful", "trusts people first".
- Reasoning must be warm and curious, like a coach. "This shows you think X first."
- No moral judgments. No "should have" / "better to have".

SCORING RULES (unchanged from business logic):
- EVERY decision MUST move at least 2 dimensions — one up, one down. No choice is free.
- The "scoring_hint" attached to the choice tells you what the choice reveals. Use it as a guide.
- Response time matters: urgent situations with very slow response = −1 to crisis_response.
- Score the INSTINCT the choice reveals, not whether the outcome would be good or bad.
- Most scores should be −3 to +3. Reserve ±5 or beyond for unmistakable signals.
- Do not reward "balanced" choices by default — sometimes picking the middle reveals indecision.

STATE CHANGES (kid-scale numbers):
- cash_delta: in rupees, typically -200 to +500. NEVER thousands.
- reputation_delta, morale_delta, customer_satisfaction_delta: -10 to +10, applied to the 0-100 scales.
- revenue_delta and expenses_delta are optional; leave at 0 unless the scenario clearly moves them.

Respond ONLY with valid JSON:
{
  "scores": {
    "risk_calibration": <integer, -10 to +10>,
    "capital_discipline": <integer>,
    "growth_instinct": <integer>,
    "operational_rigor": <integer>,
    "people_leadership": <integer>,
    "crisis_response": <integer>
  },
  "reasoning": "2-3 sentences. Growth-oriented. Warm. No moralizing. Example: 'Picking Choice B shows you lean toward steady, predictable moves. You'd rather know what's coming than chase a big upside. That will serve you well when cash is tight.'",
  "state_changes": {
    "cash_delta": <integer, rupees>,
    "reputation_delta": <integer, -10 to +10>,
    "morale_delta": <integer, -10 to +10>,
    "customer_satisfaction_delta": <integer, -10 to +10>,
    "revenue_delta": <integer, default 0>,
    "expenses_delta": <integer, default 0>
  }
}`;

/** Build the user prompt passed alongside DECISION_SCORING_PROMPT. */
export function buildScoringPrompt(params: {
  event: Pick<CeoEvent, 'category' | 'title' | 'description' | 'phase' | 'milestone' | 'choices'>;
  choiceId: CeoChoiceId;
  choiceText: string;
  responseTimeSeconds: number;
  business: Pick<
    CeoBusiness,
    'businessName' | 'businessType' | 'phase' | 'currentCash' | 'reputation' | 'morale' | 'startingCapital' | 'totalDecisions'
  >;
}): string {
  const { event, choiceId, choiceText, responseTimeSeconds, business } = params;
  const cashPct = Math.round((business.currentCash / Math.max(business.startingCapital, 1)) * 100);

  const stateSignals: string[] = [];
  if (cashPct < 20) stateSignals.push('⚠ CASH LOW — money decisions matter more');
  if (business.reputation < 30) stateSignals.push('⚠ REPUTATION DAMAGED — people/crisis decisions matter more');
  if (business.morale < 25) stateSignals.push('⚠ TEAM MORALE LOW — team decisions matter more');

  const choicesRendered = event.choices
    .map((c: CeoChoice) => `${c.id}. ${c.text}\n   [Scoring hint: ${c.scoring_hint}]`)
    .join('\n');

  const timeNote =
    responseTimeSeconds > 300
      ? '(SLOW — took over 5 minutes)'
      : responseTimeSeconds < 10
      ? '(VERY FAST — under 10 seconds, impulsive or decisive?)'
      : '';

  return `BUSINESS CONTEXT:
Type: ${business.businessType}
Name: ${business.businessName}
Phase: ${business.phase} (milestone: ${event.milestone ?? 'general'})
Decision number: ${business.totalDecisions + 1}
Cash: ₹${business.currentCash.toLocaleString('en-IN')} (${cashPct}% of starting)
Reputation: ${business.reputation}/100
Team morale: ${business.morale}/100

${stateSignals.length > 0 ? `STATE SIGNALS:\n${stateSignals.join('\n')}\n` : ''}
EVENT:
Category: ${event.category}
Title: ${event.title}
Situation: ${event.description}

CHOICES PRESENTED:
${choicesRendered}

KID'S DECISION:
Chose option ${choiceId}: "${choiceText}"
Response time: ${responseTimeSeconds} seconds ${timeNote}

Score this decision. Remember: EVERY score must move at least 2 dimensions — one up, one down. Consider the phase context and state signals above. Use warm, growth-oriented language in the reasoning.`;
}
