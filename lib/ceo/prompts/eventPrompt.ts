/** Kid CEO event-generation prompts.
 *
 *  Two flavours of event — each with its own prompt:
 *    - REGULAR events: small-stakes fiddling, doesn't affect phase. Kids
 *      get up to 5/day. Cash swings ~₹50-200, rep/morale ±1-3.
 *    - MILESTONE events: named headline beats ("THE BIG CHOICE"), huge
 *      cash swings (up to 10×), the ONLY thing that advances phases.
 *      Delivered by the daily cron at 6:30am IST. LLM generates a catchy
 *      `named_title` and bigger state_changes.
 *
 *  Kid adaptations from the SimPrenuer port:
 *    - Age 10+ reading level (Flesch-Kincaid grade 5-6)
 *    - Pocket-money stakes — never lakhs
 *    - Characters: friends, family, teachers, cousins — no investors/VCs
 *    - No violence / substances / brand names / politics / religion */

import type { CeoBusiness, CeoBusinessType } from '@/types';
import { PHASE_CONFIG, milestoneDescription, milestoneSummary } from '../phases';
import { stakesMultiplierFor } from '../constants';
import type { CurrentAffairTheme } from '../currentAffairs';

// ─── Shared core rules used by both prompts ────────────────────────────

/** Rules that apply to BOTH regular and milestone events — kid safety,
 *  choice design, anti-gaming. Built once so the two prompts stay in sync
 *  on the non-differentiated pieces. */
const SHARED_RULES = `CATEGORIES (use exactly one):
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

The "scoring_hint" field is INTERNAL ONLY — the kid never sees it.
It tells the scoring engine what the choice reveals about how this kid thinks.
Write it as: what instinct or pattern this choice exposes.`;

// ─── Regular events — small stakes, daily fiddling ─────────────────────

export const EVENT_GENERATION_PROMPT = `You are the Kid CEO Event Engine — a realistic kid-business simulation that reveals how young founders think through hard choices.

Target audience: children age 10+. All content MUST be appropriate for kids.

Generate a REGULAR everyday business situation — small-stakes, something the kid might handle between big decisions. Real but ordinary: a customer complaint, a supply hiccup, a small opportunity. Scale, language, and characters MUST match what a 10-17 year old would actually face.

${SHARED_RULES}

═══════════════════════════════════════════
STAKES FOR REGULAR EVENTS — CRITICAL
═══════════════════════════════════════════

Regular events are the SMALL decisions between milestones. They should feel real but NEVER make or break the business:
- cash_delta: ₹-200 to ₹+150 (pocket change for this business)
- reputation_delta: -3 to +3
- morale_delta: -3 to +3

A regular event should never push the kid to zero cash or 0 reputation. Save big swings for milestone events.

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

// ─── Milestone events — named big-stakes "TODAY'S BIG CHOICE" ──────────

/** System prompt for MILESTONE events. Asks for a dynamic `named_title`
 *  (catchy headline like "The Pitch Day" / "Copycat Crisis") AND for much
 *  bigger state_changes so milestone decisions actually matter. */
export const MILESTONE_EVENT_PROMPT = `You are the Kid CEO Event Engine — writing TODAY'S BIG CHOICE for a young founder.

This is a MILESTONE event — a big, named, make-or-break moment in this business's story. It will be delivered once a day as "⭐ TODAY'S BIG CHOICE ⭐". Kids wait for these. Make it feel like a real turning point.

Every milestone event MUST have:
- A catchy named_title — 2-5 words, headline style, no generic phrases. "The Pitch Day", "Copycat Crisis", "First Big Hire", "Rainstorm Friday", "The Angry Auntie", "The ₹5000 Question". Punchy, specific. Not "A Difficult Decision".
- High stakes in state_changes — cash swings from ₹-5000 to ₹+5000 are normal for a milestone. Reputation swings ±10. Morale swings ±10.
- Tension. A real possible win AND a real possible loss in the SAME scenario. If the kid picks wrong, they should feel it.

${SHARED_RULES}

═══════════════════════════════════════════
STAKES FOR MILESTONE EVENTS — CRITICAL
═══════════════════════════════════════════

Milestone events are the BIG MOMENTS. Outcome ranges scale with how pivotal the milestone is:
- For early-phase naming/picking beats (BRAND, LOCATION): cash_delta ±500, rep ±5, morale ±5.
- For launch/growth beats (OPENING_STRATEGY, FIRST_CUSTOMERS, RETENTION): cash_delta ±1500, rep ±8, morale ±8.
- For phase-transition beats (COMPETITION, EXPANSION, STRATEGIC_PIVOT, EXIT): cash_delta ±5000, rep ±15, morale ±15.

The scoring engine applies a per-milestone multiplier AFTER you emit state_changes — but you should still pick a BASE delta within the "big moment" range above, not a small one. Think "this could genuinely change the business", then write the delta.

═══════════════════════════════════════════
VARIETY RULES — CRITICAL
═══════════════════════════════════════════

Each milestone event MUST feel DIFFERENT from the last. Vary:
- The instigator: sometimes a customer, sometimes a rival, sometimes a friend, sometimes the weather, sometimes a festival, sometimes a parent, sometimes yourself second-guessing.
- The emotion: sometimes urgent, sometimes thoughtful, sometimes funny, sometimes scary-but-survivable.
- The angle on the milestone: hit the target milestone from a NEW direction each time. A RETENTION beat could be about loyalty cards, OR an auntie-regular who stopped coming, OR a rival giving free samples.
- The setting: school vs neighbourhood vs online vs park vs festival.

NEVER open two milestone events with the same pattern (e.g. "A customer complains…" twice in a row). NEVER reuse the instigator from the prior beat.

Respond ONLY with valid JSON in this exact format:
{
  "named_title": "Headline — 2 to 5 words, catchy",
  "title": "Short scenario label (max 8 words, different from named_title)",
  "category": "one of the categories above",
  "event_type": "milestone",
  "content": "3-4 sentences. Set the scene vividly. Name people. Reference this business specifically. End on tension that makes the kid WANT to decide.",
  "choices": [
    {
      "text": "Choice A — concrete action the kid takes",
      "scoring_hint": "What this reveals",
      "weights": { "dimension_key": 2, "other_dimension_key": -1 }
    },
    {
      "text": "Choice B — concrete action the kid takes",
      "scoring_hint": "What this reveals",
      "weights": { "dimension_key": 1, "other_dimension_key": -2 }
    },
    {
      "text": "Choice C — concrete action the kid takes",
      "scoring_hint": "What this reveals",
      "weights": { "dimension_key": 2, "other_dimension_key": 1 }
    }
  ]
}

Valid dimension keys: risk_calibration, capital_discipline, growth_instinct, operational_rigor, people_leadership, crisis_response.
Weight values are integers from -3 to +3. Each choice touches ≥2 dimensions with opposite signs.`;

// ─── Business-type flavour hooks ───────────────────────────────────────

/** Short per-business-type "flavour" string — a one-sentence reminder of what
 *  the everyday texture of this business looks like. Injected into every
 *  event prompt so the LLM doesn't lose the lemonade-stand voice after 20
 *  generic decisions. */
const BUSINESS_TYPE_FLAVOUR: Record<CeoBusinessType, string> = {
  lemonade:
    'Classic summer stall — bottles, ice, a folding table. Hot afternoons, school gates, cricket crowds.',
  icecream:
    'Cones and kulfi sticks, borrowed freezer, gully-cricket evenings, birthday bookings.',
  tshirt:
    'Printed tees — sketchpad, a friend with a printer, school events, festival logos.',
  games:
    'Phone or browser games you design — playable builds, class Discord, YouTube teasers.',
  crafts:
    'Handmade rakhis, diya painting, craft-fair stalls, festival seasons.',
  blog:
    'School blog / newsletter — columns, class chats, parents sharing links.',
  custom:
    'A business the kid invented — keep the scenario grounded in what THIS specific kid is running.',
};

/** Build the user prompt that goes with EVENT_GENERATION_PROMPT (regular events).
 *
 *  Injects:
 *  - Business-type flavour (keeps voice consistent)
 *  - `recentEventTitles` so the LLM can diversify (doesn't repeat the prior beat)
 *  - Business state numbers */
export function buildEventPrompt(
  business: Pick<
    CeoBusiness,
    'businessName' | 'businessType' | 'location' | 'currentCash' | 'reputation' | 'morale' | 'employees' | 'startingCapital' | 'totalDecisions'
  >,
  opts: { recentEventTitles?: string[] } = {},
): string {
  const cash = business.currentCash.toLocaleString('en-IN');
  const startingCapital = business.startingCapital.toLocaleString('en-IN');
  const flavour = BUSINESS_TYPE_FLAVOUR[business.businessType];
  const recent = opts.recentEventTitles?.filter(Boolean) ?? [];

  return `Business Type: ${business.businessType}
Business Name: ${business.businessName}
Location: ${business.location}
Flavour: ${flavour}

Current State (decision ${business.totalDecisions + 1}):
- Cash: ₹${cash} (started with ₹${startingCapital})
- Reputation: ${business.reputation}/100
- Team morale: ${business.morale}/100
- People on the team: ${business.employees}
${recent.length > 0 ? `\nRecent events (do NOT repeat the instigator or angle):\n${recent.map((t) => `- ${t}`).join('\n')}\n` : ''}
Generate a realistic kid-appropriate REGULAR (small-stakes) business situation.`;
}

/** Build a milestone-steered user prompt against the OLD freeform system
 *  prompt (EVENT_GENERATION_PROMPT). Kept for backwards compatibility with
 *  the legacy generateEvent fallback path — new code should prefer
 *  `buildMilestoneEventPrompt` which pairs with MILESTONE_EVENT_PROMPT and
 *  asks for `named_title` + bigger stakes. */
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

/** Build the user prompt that goes with MILESTONE_EVENT_PROMPT.
 *
 *  Differs from `buildMilestonePrompt`:
 *  - Carries the per-milestone `stakesMultiplier` so the LLM knows how big
 *    the swing should feel
 *  - Pulls in recent event titles + named_titles for anti-repetition
 *  - Includes an explicit "new angle" instruction for the LLM */
export function buildMilestoneEventPrompt(params: {
  business: Pick<
    CeoBusiness,
    'businessName' | 'businessType' | 'location' | 'currentCash' | 'reputation' | 'morale' | 'employees' | 'startingCapital' | 'totalDecisions' | 'phase' | 'phaseMilestones'
  >;
  milestone: string;
  /** Titles of the last 3-5 events on this business (any type). Used for anti-
   *  repetition — the LLM is told to vary angle/instigator/setting. */
  recentEventTitles?: string[];
  /** Dynamic named_titles from prior milestones — don't reuse them. */
  recentNamedTitles?: string[];
  /** Optional "what's happening in the world right now" hooks pulled from the
   *  daily current-affairs cache. LLM is instructed to OPTIONALLY weave ONE
   *  of these into the scenario so today's Big Choice feels timely. */
  currentAffairs?: CurrentAffairTheme[];
}): string {
  const {
    business,
    milestone,
    recentEventTitles = [],
    recentNamedTitles = [],
    currentAffairs = [],
  } = params;
  const base = buildEventPrompt(business, { recentEventTitles });
  const desc = milestoneDescription(business.phase, milestone);
  const summary = milestoneSummary(business.phase, business.phaseMilestones);
  const phaseLabel = PHASE_CONFIG[business.phase]?.label ?? business.phase;
  const stakes = stakesMultiplierFor(milestone);

  // Pick a stakes band based on the multiplier — gives the LLM concrete
  // numbers rather than a bare multiplier.
  const stakesBand =
    stakes <= 4
      ? 'MODEST (early-phase naming/picking — cash ±500, rep ±5, morale ±5)'
      : stakes <= 7
        ? 'MODERATE (launch/growth beat — cash ±1500, rep ±8, morale ±8)'
        : 'HIGH (phase-transition beat — cash ±5000, rep ±15, morale ±15)';

  const currentAffairsBlock =
    currentAffairs.length > 0
      ? `\nTODAY'S WORLD (optional inspiration — weave AT MOST ONE into the scenario if it fits naturally; otherwise ignore):
${currentAffairs.map((t) => `- ${t.label}: ${t.hook}`).join('\n')}

If you use one, make it feel like a natural part of the kid's world — not "here's a news headline and here's your reaction to it".
`
      : '';

  return `${base}

CURRENT PHASE: ${phaseLabel}
Milestones in this phase: ${summary}

TARGET MILESTONE: ${milestone}
This BIG CHOICE must force a decision about: ${desc}

STAKES LEVEL: ${stakesBand}. Emit state_changes in this range — the scoring engine applies its own multiplier on top.
${currentAffairsBlock}
${
  recentNamedTitles.length > 0
    ? `Named titles already used on this business (DO NOT REUSE THESE OR VARIATIONS):
${recentNamedTitles.map((t) => `- ${t}`).join('\n')}

Your named_title must be NEW. Different instigator, different angle, different setting.`
    : 'This is the first milestone — make the named_title memorable enough that the kid wants to see the next one.'
}

Do not address any other milestone. Stay focused on ${milestone}.
Ground the scenario specifically in THIS kid's business (type, location, current cash, reputation, morale).`;
}
