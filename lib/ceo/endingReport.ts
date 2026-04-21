/** Kid CEO ending-report generator (PR3).
 *
 *  Runs once when a business transitions to `status === 'completed'` in
 *  /api/ceo/decide. Produces a `CeoEndingReport` that gets merged onto the
 *  profile doc via `saveCeoProfileEnding`. The route fires-and-forgets this
 *  generation so the decide response stays fast.
 *
 *  Shape of the output:
 *    - DETERMINISTIC: top/bottom dimension rollups, dramatic-moment ranking.
 *    - LLM: `howItEnded`, style tendency/blindspot, advisors, per-moment
 *      narrative (whatHappened/takeaway), real-world archetype parallels.
 *
 *  LLM pipeline mirrors eventEngine: Groq (llama-3.3-70b) primary, Claude
 *  (Sonnet) fallback. Both get a kid-safety-heavy system prompt; the user
 *  message carries the business state, dimensions, chosen moments, and the
 *  pre-computed strengths/growthAreas so the LLM doesn't re-pick them.
 *
 *  Kid-safety rules are LOAD-BEARING: no real brands, no real people, no
 *  politics/religion/violence. Advisors are fictional first-name + role
 *  archetypes (e.g. "Priya, an auntie who runs a bakery"). Parallels are
 *  ARCHETYPES ("the neighbourhood-first founder") — never named companies. */

import { Timestamp } from 'firebase-admin/firestore';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { DIMENSIONS, DIMENSION_LABELS } from '@/lib/ceo/constants';
import { filterOutput } from '@/lib/safety/inputFilter';
import type {
  CeoAdvisor,
  CeoBusiness,
  CeoDimensionKey,
  CeoDramaticMoment,
  CeoEndingReport,
  CeoEvent,
  CeoProfile,
  CeoRealWorldParallel,
  CeoStyleSnapshot,
} from '@/types';

// ─── Tunables ────────────────────────────────────────────────

/** How many dimensions to surface as strengths (top N by score). */
const STRENGTHS_COUNT = 3;

/** How many dimensions to surface as growth areas (bottom N by score). */
const GROWTH_AREAS_COUNT = 2;

/** How many pivotal moments to feature in the report. */
const DRAMATIC_MOMENTS_COUNT = 3;

/** LLM temperature — warm but not chaotic. Slightly lower than event
 *  generation (0.9) because the report is a retrospective, not a creative
 *  brief, and we want stable kid-safe tone. */
const LLM_TEMPERATURE = 0.7;

/** Max tokens — budget accommodates all 3 moments + 3 advisors + parallels
 *  + howItEnded narrative with room to spare. */
const LLM_MAX_TOKENS = 2000;

// ─── System prompt ───────────────────────────────────────────

const ENDING_REPORT_SYSTEM_PROMPT = `You are a warm, honest coach writing an END-OF-SIMULATION report for an Indian kid (age 10+) who just finished running a pretend business.

Your job: turn their journey into a kind, specific retrospective. Praise their strengths. Frame growth areas constructively — never shaming. Make it feel personal, like a favourite teacher writing a note.

═══════════════════════════════════════════
KID-SAFETY RULES — CRITICAL, NON-NEGOTIABLE
═══════════════════════════════════════════

- Age 10+. Simple words. Short sentences. Classroom-story tone.
- Money at pocket-money scale — rupees, never lakhs/crores.
- NO real brand names (no Amazon, no Amul, no Zomato, no Apple).
- NO real people (no Ambani, no Musk, no Tata, no any named founder).
- NO politics, NO religion, NO violence, NO substances, NO gambling.
- NO romance, NO adult themes, NO scary scenarios.
- Cultural grounding in India OK (festivals, neighbourhoods, foods, seasons) — but NEVER stereotyping.
- Characters are archetypes: aunties, uncles, cousins, teachers, neighbours, shopkeepers. Advisors are FICTIONAL with first names + short roles (e.g. "Priya, an auntie who runs a bakery").

═══════════════════════════════════════════
TONE
═══════════════════════════════════════════

- Warm but honest. Don't flatter — kids smell it a mile away.
- Celebrate strengths CONCRETELY ("you spotted the busy weekend early") not vaguely ("you were smart").
- Frame growth areas as "what's next to try" — never as failures.
- No jargon. No MBA words. No "synergize", "leverage", "capitalize".

═══════════════════════════════════════════
RETURN SHAPE — JSON ONLY, NO MARKDOWN, NO PREAMBLE
═══════════════════════════════════════════

{
  "howItEnded": "2-3 sentences recapping how the simulation wrapped up. Speak directly to the kid ('you').",
  "yourTendency": "1 sentence: what patterns they showed across decisions.",
  "blindSpot": "1 sentence: what they tended to skip or avoid, framed constructively.",
  "advisors": [
    {
      "name": "Fictional first name + short role",
      "tone": "warm" | "sharp" | "playful",
      "advice": "2-3 sentences of specific, kid-readable advice tied to their style."
    }
    // 2-3 advisors total
  ],
  "dramaticMoments": [
    {
      "whatHappened": "1-2 sentences recapping the moment in plain English.",
      "takeaway": "1 sentence on what this kid can take from that moment."
    }
    // EXACTLY the same count as the input moments, in the SAME order.
  ],
  "parallels": [
    {
      "archetype": "Short archetype label, e.g. 'the neighbourhood-first founder'",
      "parallel": "1-2 sentence description of the GENERIC business type this archetype runs — NEVER a named company.",
      "takeaway": "1 sentence practical takeaway for a kid."
    }
    // 1-2 parallels total
  ]
}

REMEMBER: no real brands, no real people, no politics/religion/violence. Advisors and parallels are ARCHETYPES with made-up names.`;

// ─── LLM response shape ──────────────────────────────────────

interface LlmEndingResponse {
  howItEnded: string;
  yourTendency: string;
  blindSpot: string;
  advisors: Array<{
    name: string;
    tone: string;
    advice: string;
  }>;
  dramaticMoments: Array<{
    whatHappened: string;
    takeaway: string;
  }>;
  parallels: Array<{
    archetype: string;
    parallel: string;
    takeaway: string;
  }>;
}

// ─── Deterministic computations ──────────────────────────────

/** Rank all six dimensions by score descending. Stable — ties break by the
 *  dimension order declared in `DIMENSIONS` so the same profile always
 *  produces the same strengths/growth list. */
function rankDimensions(
  dimensions: CeoProfile['dimensions'],
): CeoDimensionKey[] {
  const entries = DIMENSIONS.map((key) => ({
    key,
    score: dimensions[key]?.score ?? 50,
  }));
  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable tiebreak: preserve DIMENSIONS declaration order.
    return DIMENSIONS.indexOf(a.key) - DIMENSIONS.indexOf(b.key);
  });
  return entries.map((e) => e.key);
}

/** Sum of absolute dimension-score magnitudes on a decided event. Used as a
 *  tiebreaker for dramatic-moment ranking — bigger swings = more impactful
 *  decision. */
function eventScoreMagnitude(event: CeoEvent): number {
  if (!event.scores) return 0;
  return Object.values(event.scores).reduce(
    (acc, v) => acc + Math.abs(Number(v) || 0),
    0,
  );
}

/** Pick the top DRAMATIC_MOMENTS_COUNT events. Heuristic:
 *    1. Milestone events (eventType === 'milestone') outrank regulars.
 *    2. Within a tier, sort by stakesMultiplier descending.
 *    3. Tiebreak by absolute dimension-score magnitude descending.
 *    4. Final tiebreak: decisionTimestamp descending (most recent first).
 *
 *  Why this heuristic: the event doc doesn't persist applied cash/rep
 *  deltas, so we can't compute them from a single event. But milestones +
 *  high stakesMultiplier + high dimension swings all correlate strongly
 *  with "this decision mattered" — which is exactly what a dramatic-moment
 *  feature should surface. */
function pickDramaticEvents(events: CeoEvent[]): CeoEvent[] {
  const ranked = [...events].sort((a, b) => {
    const aIsMilestone = (a.eventType ?? (a.milestone ? 'milestone' : 'regular')) === 'milestone';
    const bIsMilestone = (b.eventType ?? (b.milestone ? 'milestone' : 'regular')) === 'milestone';
    if (aIsMilestone !== bIsMilestone) return aIsMilestone ? -1 : 1;

    const aStakes = a.stakesMultiplier ?? 1;
    const bStakes = b.stakesMultiplier ?? 1;
    if (aStakes !== bStakes) return bStakes - aStakes;

    const aMag = eventScoreMagnitude(a);
    const bMag = eventScoreMagnitude(b);
    if (aMag !== bMag) return bMag - aMag;

    const aTs = tsToMillis(a.decisionTimestamp);
    const bTs = tsToMillis(b.decisionTimestamp);
    return bTs - aTs;
  });
  return ranked.slice(0, DRAMATIC_MOMENTS_COUNT);
}

/** Best-effort conversion of a Firestore Timestamp (or ISO string) to
 *  millis. Returns 0 on anything unparseable so sort still works. */
function tsToMillis(
  ts: CeoEvent['decisionTimestamp'] | null | undefined,
): number {
  if (!ts) return 0;
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof ts === 'object' && 'seconds' in ts) {
    return ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1e6);
  }
  return 0;
}

/** Map dimension keys to kid-facing labels from constants. */
function toKidLabels(keys: readonly CeoDimensionKey[]): string[] {
  return keys.map((k) => DIMENSION_LABELS[k]?.name ?? k);
}

// ─── Outcome classification ──────────────────────────────────

/** Classify how the simulation ended — feeds the LLM so the `howItEnded`
 *  copy matches the actual outcome rather than sounding generic. */
function classifyOutcome(business: CeoBusiness): 'strong' | 'shaky' | 'broke' | 'incomplete' {
  if (business.currentCash <= 0) return 'broke';
  if (business.status !== 'completed') return 'incomplete';
  // Completed + still has money — grade by reputation + cash headroom.
  const cashRatio = business.startingCapital > 0 ? business.currentCash / business.startingCapital : 1;
  if (business.reputation >= 60 && cashRatio >= 0.5) return 'strong';
  return 'shaky';
}

// ─── LLM pipeline ────────────────────────────────────────────

/** Run Groq → Claude, returning null if both fail so the caller can fall
 *  back to a minimal deterministic-only report. */
async function runEndingLlmPipeline(userMessage: string): Promise<LlmEndingResponse | null> {
  try {
    return await generateJsonWithGroq<LlmEndingResponse>({
      systemPrompt: ENDING_REPORT_SYSTEM_PROMPT,
      userMessage,
      temperature: LLM_TEMPERATURE,
      maxTokens: LLM_MAX_TOKENS,
    });
  } catch (groqErr) {
    console.warn(
      '[ceo/endingReport] Groq failed, trying Claude:',
      (groqErr as Error).message,
    );
  }

  try {
    return await generateJsonWithClaude<LlmEndingResponse>({
      systemPrompt: ENDING_REPORT_SYSTEM_PROMPT,
      userMessage,
      temperature: LLM_TEMPERATURE,
      maxTokens: LLM_MAX_TOKENS,
    });
  } catch (claudeErr) {
    console.warn(
      '[ceo/endingReport] Claude failed, returning null:',
      (claudeErr as Error).message,
    );
  }

  return null;
}

/** Build the user-side message the LLM reads — carries all the concrete
 *  facts about the run so the generated narrative is specific, not generic. */
function buildUserPrompt(params: {
  business: CeoBusiness;
  profile: CeoProfile;
  outcome: ReturnType<typeof classifyOutcome>;
  strengths: string[];
  growthAreas: string[];
  dramaticEvents: CeoEvent[];
  totalDecisions: number;
}): string {
  const { business, profile, outcome, strengths, growthAreas, dramaticEvents, totalDecisions } = params;

  const dimensionLines = DIMENSIONS.map((key) => {
    const d = profile.dimensions[key];
    const label = DIMENSION_LABELS[key]?.name ?? key;
    return `- ${label} (${key}): score ${d?.score ?? 50}, ${d?.decisions ?? 0} decisions`;
  }).join('\n');

  const momentLines = dramaticEvents
    .map((e, idx) => {
      const headline = e.namedTitle ?? e.title;
      const type = e.eventType ?? (e.milestone ? 'milestone' : 'regular');
      return `${idx + 1}. "${headline}" — ${type} event, category: ${e.category}, phase: ${e.phase}${
        e.milestone ? `, milestone: ${e.milestone}` : ''
      }`;
    })
    .join('\n');

  const outcomeDescription = {
    strong: 'They finished the simulation strong — money held up and reputation stayed solid.',
    shaky: 'They made it to the end, but it was bumpy — money ran thin or reputation dipped.',
    broke: 'They ran out of cash before the full arc completed.',
    incomplete: 'The simulation wrapped up without completing every phase.',
  }[outcome];

  return `The kid just finished running a pretend business. Write their ending report.

BUSINESS
- Name: ${business.businessName}
- Type: ${business.businessType}
- Location: ${business.location}
- Starting capital: ₹${business.startingCapital}
- Final cash: ₹${business.currentCash}
- Final reputation: ${business.reputation}/100
- Final morale: ${business.morale}/100
- Total decisions made: ${totalDecisions}
- Final phase reached: ${business.phase}

OUTCOME
${outcomeDescription}

DIMENSIONS (pre-computed, DO NOT re-rank — use these as facts)
${dimensionLines}

TOP 3 STRENGTHS (already chosen — reflect these in your tone)
${strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

BOTTOM 2 GROWTH AREAS (frame constructively, never shaming)
${growthAreas.map((g, i) => `${i + 1}. ${g}`).join('\n')}

THE 3 DRAMATIC MOMENTS TO NARRATE (in this exact order)
${momentLines || '(no decided events yet — describe the opening of the journey instead)'}

TASK
Return JSON with these keys (see system prompt for exact shape):
- howItEnded (2-3 sentences)
- yourTendency (1 sentence)
- blindSpot (1 sentence)
- advisors (2-3 fictional advisors — first name + short role, tone + 2-3 sentences of advice)
- dramaticMoments (${dramaticEvents.length} entries, SAME ORDER as above — whatHappened + takeaway each)
- parallels (1-2 fictional founder ARCHETYPES — NEVER named companies or real people)

Respond with JSON only.`;
}

// ─── Compose ─────────────────────────────────────────────────

/** Validate an LLM advisor tone, coercing unknowns to 'warm'. */
function coerceAdvisorTone(raw: string | undefined): CeoAdvisor['tone'] {
  if (raw === 'warm' || raw === 'sharp' || raw === 'playful') return raw;
  return 'warm';
}

/** Build a minimal deterministic-only report when the LLM fails entirely.
 *  Kept short and tonally neutral — better than failing, worse than the
 *  full LLM narrative, but keeps the UI usable. */
function buildFallbackReport(params: {
  business: CeoBusiness;
  style: CeoStyleSnapshot;
  dramaticEvents: CeoEvent[];
  outcome: ReturnType<typeof classifyOutcome>;
}): CeoEndingReport {
  const { business, style, dramaticEvents, outcome } = params;

  const outcomeLine = {
    strong: `You finished ${business.businessName} strong — money held up and people liked what you built.`,
    shaky: `You made it through ${business.businessName} — the ride was bumpy, but you kept it moving.`,
    broke: `${business.businessName} ran out of money before the full story wrapped up. That's a real thing that happens to real founders — and now you've felt it.`,
    incomplete: `You wrapped up your time with ${business.businessName} — some chapters still to tell another run.`,
  }[outcome];

  return {
    howItEnded: outcomeLine,
    style,
    advisors: [
      {
        name: 'Priya, an auntie who runs a bakery',
        tone: 'warm',
        advice:
          'Every kid who runs a business learns something real. Trust what your gut told you this run, and tweak just one thing next time.',
      },
      {
        name: 'Ravi, a teacher who used to coach a debate team',
        tone: 'sharp',
        advice:
          'Look back at the calls you made under pressure. The habits you showed there are the ones that shape a real founder.',
      },
    ],
    dramaticMoments: dramaticEvents.map((e) => ({
      eventId: e.id,
      headline: e.namedTitle ?? e.title,
      whatHappened: `You faced a ${e.category} moment: ${e.title}.`,
      takeaway: 'Every big call teaches you something about how you lead.',
      cashDelta: 0,
      reputationDelta: 0,
    })),
    parallels: [
      {
        archetype: 'the neighbourhood-first founder',
        parallel:
          'A kid-scale business that grows by being the favourite on one street before thinking about the next one.',
        takeaway: 'Win your block before you chase the city.',
      },
    ],
    generatedAt: Timestamp.now(),
  };
}

// ─── Public API ──────────────────────────────────────────────

export interface GenerateEndingReportParams {
  business: CeoBusiness;
  profile: CeoProfile;
  /** Decided events for this business. Order is not significant — this
   *  function re-ranks internally. */
  decidedEvents: CeoEvent[];
}

/** Generate an ending report for a completed business. Merges deterministic
 *  dimension rollups + dramatic-moment ranking with LLM-authored narrative
 *  (howItEnded, advisors, per-moment recap, parallels).
 *
 *  Never throws on LLM failure — falls back to a minimal deterministic
 *  report so the kid still sees something. Callers fire-and-forget this. */
export async function generateEndingReport(
  params: GenerateEndingReportParams,
): Promise<CeoEndingReport> {
  const { business, profile, decidedEvents } = params;

  // ── Deterministic: strengths / growth / dramatic moments ─────
  const ranked = rankDimensions(profile.dimensions);
  const strengthKeys = ranked.slice(0, STRENGTHS_COUNT);
  const growthKeys = ranked.slice(-GROWTH_AREAS_COUNT).reverse(); // lowest-scored first
  const strengths = toKidLabels(strengthKeys);
  const growthAreas = toKidLabels(growthKeys);
  const dramaticEvents = pickDramaticEvents(decidedEvents);
  const outcome = classifyOutcome(business);

  // Edge case: no decisions at all. Still produce a minimal report rather
  // than failing — the business completing with zero decisions is weird
  // but not something the kid should see as a crash.
  if (decidedEvents.length === 0) {
    console.warn(
      '[ceo/endingReport] generating report with 0 decided events for business',
      business.id,
    );
  }

  // ── LLM: narrative pieces ─────────────────────────────────────
  const userPrompt = buildUserPrompt({
    business,
    profile,
    outcome,
    strengths,
    growthAreas,
    dramaticEvents,
    totalDecisions: profile.totalDecisions ?? decidedEvents.length,
  });

  const llm = await runEndingLlmPipeline(userPrompt);

  const style: CeoStyleSnapshot = {
    strengths,
    growthAreas,
    yourTendency: filterOutput(
      llm?.yourTendency?.trim() || 'You showed up, made calls, and kept the story moving.',
    ),
    blindSpot: filterOutput(
      llm?.blindSpot?.trim() ||
        'There were quieter corners of the business you could explore next time.',
    ),
  };

  if (!llm) {
    return buildFallbackReport({ business, style, dramaticEvents, outcome });
  }

  // ── Compose the final report ─────────────────────────────────
  // SECURITY: every LLM-authored user-facing field is run through
  // filterOutput() to redact any PII the model might hallucinate (phone,
  // email, address, Aadhaar). This complements (doesn't replace) the
  // kid-safety rules in the system prompt. Deterministic fields (headline
  // coming from our own event data) don't need re-filtering — events were
  // already filtered at generation time in eventEngine.
  const advisors: CeoAdvisor[] = Array.isArray(llm.advisors)
    ? llm.advisors.slice(0, 3).map((a) => ({
        name: filterOutput(String(a.name ?? '').trim()) || 'A kind mentor',
        tone: coerceAdvisorTone(a.tone),
        advice:
          filterOutput(String(a.advice ?? '').trim()) ||
          'Keep going — every run teaches you something.',
      }))
    : [];

  // Map LLM per-moment narrative onto our deterministic event list by
  // index — the prompt tells the LLM to preserve order.
  const dramaticMoments: CeoDramaticMoment[] = dramaticEvents.map((event, idx) => {
    const narrative = llm.dramaticMoments?.[idx];
    return {
      eventId: event.id,
      headline: event.namedTitle ?? event.title,
      whatHappened: filterOutput(
        narrative?.whatHappened?.trim() ||
          `You faced a ${event.category} moment — ${event.title}.`,
      ),
      takeaway: filterOutput(
        narrative?.takeaway?.trim() || 'Every big call teaches you something about how you lead.',
      ),
      // Applied deltas aren't persisted per-event, so these stay 0. The UI
      // should treat them as "cosmetic"; the headline + narrative carries
      // the weight. See task spec.
      cashDelta: 0,
      reputationDelta: 0,
    };
  });

  const parallels: CeoRealWorldParallel[] = Array.isArray(llm.parallels)
    ? llm.parallels.slice(0, 2).map((p) => ({
        archetype: filterOutput(String(p.archetype ?? '').trim()) || 'the steady builder',
        parallel:
          filterOutput(String(p.parallel ?? '').trim()) ||
          'A founder who grows by showing up every day.',
        takeaway: filterOutput(String(p.takeaway ?? '').trim()) || 'Consistency beats flash.',
      }))
    : [];

  return {
    howItEnded: filterOutput(
      llm.howItEnded?.trim() ||
        `You wrapped up your run with ${business.businessName}. That's a real journey — and you made real calls.`,
    ),
    style,
    advisors: advisors.length > 0 ? advisors : buildFallbackReport({ business, style, dramaticEvents, outcome }).advisors,
    dramaticMoments,
    parallels: parallels.length > 0 ? parallels : buildFallbackReport({ business, style, dramaticEvents, outcome }).parallels,
    generatedAt: Timestamp.now(),
  };
}
