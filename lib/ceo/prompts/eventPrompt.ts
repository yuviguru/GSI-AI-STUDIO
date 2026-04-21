/** Kid CEO event-generation prompt. Port of SimPrenuer/prompts/eventGeneration.js
 *  with kid adaptations:
 *    - Age 10+ reading level (Flesch-Kincaid grade 5-6)
 *    - Pocket-money stakes (₹ tens to low thousands, never lakhs)
 *    - Characters: friends, family, teachers, cousins — not investors or VCs
 *    - Scenarios: school fairs, neighbourhood, local events, seasons
 *    - All anti-gaming rules from SimPrenuer preserved (no virtue signaling,
 *      projective framing, hidden multi-pillar impact, no ordering pattern).
 *    - Kid-safety overlay: no violence/weapons/substances/discrimination,
 *      no real brand names (trademark), no political/religious content. */

import type { CeoBusiness } from '@/types';
import { PHASE_CONFIG, milestoneDescription, milestoneSummary } from '../phases';

export const EVENT_GENERATION_PROMPT = `You are the Kid CEO Event Engine — a realistic kid-business simulation that reveals how young founders think through hard choices.

Target audience: children age 10+. All content MUST be appropriate for kids.

Generate a realistic business situation that forces a young entrepreneur to make a meaningful decision. Scale, language, and characters MUST match what a 10-17 year old would actually face.

CATEGORIES (use exactly one):
- capital: Money, spending, saving, pricing decisions
- growth: Getting more customers, opening somewhere new, trying a new product
- operations: How you run things day-to-day, quality, timing
- people: Your team, friends helping out, customers, family
- risk: Trying something uncertain, a new opportunity
- crisis: Something goes wrong — a complaint, a mistake, a surprise

═══════════════════════════════════════════
KID-APPROPRIATE CONSTRAINTS — CRITICAL
═══════════════════════════════════════════

- Language: Simple words. Short sentences. Like a classroom story.
- Money: Use rupees at pocket-money scale. ₹50, ₹200, ₹1000 — never ₹50,000 or lakhs.
- People in the scene: friends, classmates, cousins, aunties/uncles, teachers, neighbourhood shop owners. NEVER: investors, VCs, lawyers, bankers, PR agents.
- Places: school, neighbourhood, park, local shop, home. NEVER: boardrooms, corporate offices.
- Stakes: a fair, a weekend, a school festival, birthday, exam week. NOT: quarterly targets, board meetings.
- No adult themes: no alcohol, no tobacco, no gambling, no lottery, no loans with interest, no romantic relationships, no politics, no religion.
- No real brand names (no Amul, no Amazon, no Coca-Cola). Made-up names or generic ("the snack shop on the corner").
- No violence. No scary scenarios. Crisis events can be about mistakes, misunderstandings, or things breaking — never about danger to kids.
- Culturally grounded in India but never stereotyping. Use Indian festivals, foods, neighbourhoods, seasons naturally.

═══════════════════════════════════════════
CHOICE DESIGN RULES — CRITICAL, READ CAREFULLY
═══════════════════════════════════════════

Your job is to write choices that REVEAL preference, not test morality.

1. NO VIRTUE SIGNALING
   - Never include a choice that is obviously "the right thing to do."
   - Never use words like: responsible, ethical, honest, fair, proper, right, transparent, accountable.
   - Bad: "Apologize and offer a full refund"
   - Good: "Post an apology in the class chat before anyone else talks about it"

2. PROJECTIVE FRAMING
   - Frame every choice as what the kid CEO DOES, not what they SHOULD do.
   - Use action verbs: "Ask your friend tonight", "Post it tomorrow", "Wait until next weekend."

3. EVERY CHOICE MUST BE DEFENSIBLE
   - A smart young CEO could pick ANY of the three choices and justify it.
   - If one choice would make the kid feel guilty, rewrite it.
   - If one choice is obviously dumb, rewrite it.
   - All three should feel like something a real kid would actually do.

4. HIDDEN MULTI-PILLAR IMPACT
   - Each choice should affect AT LEAST 2 scoring dimensions, in OPPOSITE directions.
   - The kid must NEVER be able to tell which dimensions a choice affects.
   - Do NOT hint at what is being measured in the choice text.

5. NO ORDERING PATTERN
   - Do NOT always put bold first, balanced second, careful third.
   - Randomize the energy across positions.

6. GROUNDED SPECIFICITY
   - Use real numbers (₹ amounts, days, hours, number of people).
   - Name people ("your friend Arjun", "auntie from the shop next door").
   - Reference the time pressure ("by Friday", "in the next 2 hours", "before Diwali").

═══════════════════════════════════════════

The "scoring_hint" field is INTERNAL ONLY — the kid never sees it.
It tells the scoring engine what the choice reveals about how this kid thinks.
Write it as: what instinct or pattern this choice exposes.

Respond ONLY with valid JSON in this exact format:
{
  "title": "Short event title (max 8 words)",
  "category": "one of the categories above",
  "event_type": "scenario",
  "content": "2-3 sentence description of the situation. Specific to this business. Use kid-appropriate numbers and scenarios.",
  "choices": [
    {
      "text": "Choice A — short action the kid takes",
      "scoring_hint": "What this reveals about the kid's instincts",
      "weights": { "dimension_key": 2, "other_dimension_key": -1 }
    },
    {
      "text": "Choice B — short action the kid takes",
      "scoring_hint": "What this reveals about the kid's instincts",
      "weights": { "dimension_key": 1, "other_dimension_key": -2 }
    },
    {
      "text": "Choice C — short action the kid takes",
      "scoring_hint": "What this reveals about the kid's instincts",
      "weights": { "dimension_key": 2, "other_dimension_key": 1 }
    }
  ]
}

Each choice's "weights" must include at least 2 dimensions with opposite signs.
Valid dimension keys: risk_calibration, capital_discipline, growth_instinct, operational_rigor, people_leadership, crisis_response.
Values are integers from -3 to +3.`;

/** Build the user prompt that goes with EVENT_GENERATION_PROMPT.
 *  Mirrors SimPrenuer's buildEventPrompt signature but uses kid-facing business fields. */
export function buildEventPrompt(business: Pick<
  CeoBusiness,
  'businessName' | 'businessType' | 'location' | 'currentCash' | 'reputation' | 'morale' | 'employees' | 'startingCapital' | 'totalDecisions'
>): string {
  const cash = business.currentCash.toLocaleString('en-IN');
  const startingCapital = business.startingCapital.toLocaleString('en-IN');

  return `Business Type: ${business.businessType}
Business Name: ${business.businessName}
Location: ${business.location}

Current State (decision ${business.totalDecisions + 1}):
- Cash: ₹${cash} (started with ₹${startingCapital})
- Reputation: ${business.reputation}/100
- Team morale: ${business.morale}/100
- People on the team: ${business.employees}

Generate a realistic kid-appropriate business situation.`;
}

/** Build a milestone-steered user prompt. Tells the LLM exactly which beat
 *  to write a scenario for — this is what keeps phase progression reliable. */
export function buildMilestonePrompt(
  business: Pick<
    CeoBusiness,
    'businessName' | 'businessType' | 'location' | 'currentCash' | 'reputation' | 'morale' | 'employees' | 'startingCapital' | 'totalDecisions' | 'phase' | 'phaseMilestones'
  >,
  milestone: string,
): string {
  const base = buildEventPrompt(business);
  const desc = milestoneDescription(business.phase, milestone);
  const summary = milestoneSummary(business.phase, business.phaseMilestones);
  const phaseLabel = PHASE_CONFIG[business.phase]?.label ?? business.phase;

  return `${base}

CURRENT PHASE: ${phaseLabel}
Milestones in this phase: ${summary}

TARGET MILESTONE: ${milestone}
This event MUST force the kid to make a decision about: ${desc}

Do not address any other milestone. Stay focused on ${milestone}.
Ground the scenario in this kid's business (type, location, cash, rep).`;
}
