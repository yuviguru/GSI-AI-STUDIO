/** Kid CEO event generator — TWO-PATH MODEL (PR 2 redesign).
 *
 *  Paths:
 *  - REGULAR event: small-stakes, daily fiddling, NEVER advances phase,
 *    capped 5/day via the business doc counters. Uses EVENT_GENERATION_PROMPT.
 *  - MILESTONE event: named "TODAY'S BIG CHOICE", big cash/rep swings, the
 *    ONLY event that can advance a phase. Uses MILESTONE_EVENT_PROMPT and
 *    asks the LLM for a dynamic `named_title`. Delivered by the daily cron.
 *
 *  `generateEvent()` auto-routes: if a milestone is passed → milestone path,
 *  otherwise → regular path. Direct callers that KNOW the type can use
 *  `generateRegularEvent()` / `generateMilestoneEvent()`.
 *
 *  Pipeline (same for both): Groq (llama-3.3-70b) primary, Claude (Sonnet)
 *  fallback, template events as last resort. Pure generation only — no
 *  Firestore writes; caller hands the result to ceoService.saveCeoEvent. */

import { generateJsonWithGroq } from '@gsi/ai/groqClient';
import { generateJsonWithClaude } from '@gsi/ai/claudeClient';
import type {
  CeoBusiness,
  CeoChoice,
  CeoChoiceId,
  CeoEvent,
  CeoEventType,
} from '@gsi/types';
import {
  MILESTONE_FALLBACK_CATEGORY,
  stakesMultiplierFor,
  STAKES_MULTIPLIER,
  type CeoEventCategory,
} from './constants';
import {
  EVENT_GENERATION_PROMPT,
  MILESTONE_EVENT_PROMPT,
  buildEventPrompt,
  buildMilestoneEventPrompt,
} from './prompts/eventPrompt';
import fallbackEvents from './templates/events.json';
import { getCurrentAffairsReadOnly, pickThemes } from './currentAffairs';
import { filterOutput } from '@gsi/safety';

/** Shape the LLM is asked to return. `named_title` is ONLY emitted for
 *  milestone events — the regular prompt doesn't ask for it and we don't
 *  require it there. */
interface LlmEventResponse {
  title: string;
  named_title?: string;
  category: string;
  event_type: string;
  content: string;
  choices: Array<{
    id?: string;
    text: string;
    scoring_hint: string;
    weights: Record<string, number>;
  }>;
}

/** What this module returns to callers — the raw generated event, ready to be
 *  persisted via ceoService.saveCeoEvent(). Omits Firestore-assigned fields
 *  (id, status, createdAt, expiresAt, decision fields). `userId` + `kidId`
 *  are denormalised from the parent business so downstream queries can
 *  filter events by kid without an extra join. */
export interface GeneratedEvent {
  businessId: string;
  userId: string;
  kidId: string;
  title: string;
  description: string;
  category: string;
  phase: CeoBusiness['phase'];
  milestone: string | null;
  choices: CeoChoice[];
  // PR2: two-path differentiation.
  eventType: CeoEventType;
  namedTitle?: string;
  stakesMultiplier: number;
  // Phase 3 — when set, the UI renders the agent-driven card instead of
  // the A/B/C picker. Absent on milestones the legacy flow still owns
  // and on all regular events.
  agentWorkflowId?: string;
}

interface GenerateEventParams {
  business: CeoBusiness;
  milestone?: string | null;
  /** Titles of the last 3-5 events on this business (any type). Lets the
   *  LLM avoid repeating the prior beat. */
  recentEventTitles?: string[];
  /** Named titles already used on prior milestone events (so the LLM picks
   *  a NEW headline). */
  recentNamedTitles?: string[];
}

/** Main entry. Auto-routes to regular-event or milestone-event generation
 *  based on whether `milestone` is provided. Falls back to template events
 *  on LLM failure. */
export async function generateEvent(params: GenerateEventParams): Promise<GeneratedEvent> {
  return params.milestone
    ? generateMilestoneEvent({
        business: params.business,
        milestone: params.milestone,
        recentEventTitles: params.recentEventTitles,
        recentNamedTitles: params.recentNamedTitles,
      })
    : generateRegularEvent({
        business: params.business,
        recentEventTitles: params.recentEventTitles,
      });
}

/** Regular event — small stakes, no phase advance, cap enforced at the
 *  route layer. */
export async function generateRegularEvent(params: {
  business: CeoBusiness;
  recentEventTitles?: string[];
}): Promise<GeneratedEvent> {
  const { business, recentEventTitles } = params;
  const userPrompt = buildEventPrompt(business, { recentEventTitles });

  const raw = await runLlmPipeline(EVENT_GENERATION_PROMPT, userPrompt);
  if (!raw) return buildFallbackEvent(business, null);
  return shapeLlmEvent(raw, business, null, 'regular');
}

/** Milestone event — "TODAY'S BIG CHOICE", named + big stakes, ONLY events
 *  that can advance phases. Always targets one specific milestone.
 *
 *  Pulls 2 current-affairs themes from today's cache and passes them as
 *  optional inspiration — the LLM is instructed to weave AT MOST ONE into
 *  the scenario if it fits, else ignore. Keeps milestones feeling timely
 *  without forcing every event to be about the headlines. */
export async function generateMilestoneEvent(params: {
  business: CeoBusiness;
  milestone: string;
  recentEventTitles?: string[];
  recentNamedTitles?: string[];
}): Promise<GeneratedEvent> {
  const { business, milestone, recentEventTitles, recentNamedTitles } = params;

  // Best-effort pull — read-only (cache or evergreen fallback), never hits
  // the LLM synchronously. If Firestore hiccups it returns the evergreen
  // pool, so this never throws or blocks the generation.
  let currentAffairs: Awaited<ReturnType<typeof getCurrentAffairsReadOnly>> = [];
  try {
    const all = await getCurrentAffairsReadOnly();
    // Pick 2 themes, preferring ones that match this milestone's natural
    // category (e.g. a crisis milestone prefers crisis-tagged themes).
    const fallbackCategory = MILESTONE_FALLBACK_CATEGORY[milestone];
    currentAffairs = pickThemes(all, {
      count: 2,
      preferCategories: fallbackCategory ? [fallbackCategory] : [],
    });
  } catch (err) {
    console.warn(
      '[ceo/eventEngine] current-affairs read failed, proceeding without:',
      (err as Error).message,
    );
  }

  const userPrompt = buildMilestoneEventPrompt({
    business,
    milestone,
    recentEventTitles,
    recentNamedTitles,
    currentAffairs,
  });

  const raw = await runLlmPipeline(MILESTONE_EVENT_PROMPT, userPrompt);
  if (!raw) return buildFallbackEvent(business, milestone);
  return shapeLlmEvent(raw, business, milestone, 'milestone');
}

/** Run the Groq → Claude LLM pipeline and return parsed JSON, or null if
 *  both providers fail (caller should fall back to templates). */
async function runLlmPipeline(
  systemPrompt: string,
  userMessage: string,
): Promise<LlmEventResponse | null> {
  try {
    return await generateJsonWithGroq<LlmEventResponse>({
      systemPrompt,
      userMessage,
      temperature: 0.9, // Bumped from 0.85 — variety is a PR2 priority
      maxTokens: 1400,
    });
  } catch (groqErr) {
    console.warn('[ceo/eventEngine] Groq failed, trying Claude:', (groqErr as Error).message);
  }

  try {
    return await generateJsonWithClaude<LlmEventResponse>({
      systemPrompt,
      userMessage,
      temperature: 0.9,
      maxTokens: 1400,
    });
  } catch (claudeErr) {
    console.warn(
      '[ceo/eventEngine] Claude failed, using template fallback:',
      (claudeErr as Error).message,
    );
  }

  return null;
}

/** Validate + normalize the LLM response into our CeoChoice shape.
 *  The LLM may use "A"/"B"/"C" OR just position — we enforce the tri-choice
 *  contract here. */
function shapeLlmEvent(
  raw: LlmEventResponse,
  business: CeoBusiness,
  milestone: string | null,
  eventType: CeoEventType,
): GeneratedEvent {
  if (!raw.title || !raw.category || !raw.content || !Array.isArray(raw.choices) || raw.choices.length !== 3) {
    throw new Error('Invalid event structure from LLM');
  }

  const choiceIds: readonly CeoChoiceId[] = ['A', 'B', 'C'] as const;
  // SECURITY: every user-facing field from the LLM is run through
  // filterOutput() before it lands in Firestore. Redacts PII (phone,
  // email, addresses, Aadhaar) that the LLM might hallucinate into a
  // scenario. choice.text is rendered to the kid; scoring_hint is
  // internal-only per the prompt but filtered defensively in case the
  // model leaks it into the text field. This complements (not replaces)
  // the kid-safety rules in the system prompt — prompts alone can't
  // guarantee zero PII leaks from a stochastic model.
  const choices: CeoChoice[] = raw.choices.slice(0, 3).map((c, idx) => ({
    id: choiceIds[idx] ?? 'A',
    text: filterOutput(String(c.text).trim()),
    scoring_hint: filterOutput(String(c.scoring_hint ?? '').trim()),
    weights: sanitizeWeights(c.weights),
  }));

  // Milestone events SHOULD carry a named_title from the LLM; if the LLM
  // skipped it (happens ~1% of the time with Groq), synthesise one from
  // the milestone name so the "TODAY'S BIG CHOICE" banner still has a
  // meaningful headline.
  const namedTitle =
    eventType === 'milestone'
      ? filterOutput(
          raw.named_title?.trim() || synthNamedTitle(milestone),
        ) || undefined
      : undefined;

  const stakesMultiplier =
    eventType === 'milestone' ? stakesMultiplierFor(milestone) : STAKES_MULTIPLIER.regular;

  // Phase 3 — per-milestone agent routing. When a milestone is handled by
  // an agent workflow (currently only BRAND), the event doc carries the
  // workflow id and the web UI routes to the AgentEventCard flow. Kid can
  // still fall back to the legacy A/B/C choices (kept alongside) if the
  // agent flow errors out — defence in depth for the first ship.
  const agentWorkflowId = resolveAgentWorkflowId(eventType, milestone);

  return {
    businessId: business.id,
    userId: business.userId,
    kidId: business.kidId,
    title: filterOutput(raw.title.trim()),
    description: filterOutput(raw.content.trim()),
    category: raw.category.trim(),
    phase: business.phase,
    milestone,
    choices,
    eventType,
    namedTitle,
    stakesMultiplier,
    agentWorkflowId,
  };
}

/** Map a milestone name to the agent workflow that handles it, or null
 *  for milestones still on the legacy A/B/C path. Per-agent stories
 *  grow this mapping. */
function resolveAgentWorkflowId(
  eventType: CeoEventType,
  milestone: string | null,
): string | undefined {
  if (eventType !== 'milestone' || !milestone) return undefined;
  const MILESTONE_TO_WORKFLOW: Record<string, string | undefined> = {
    BRAND: 'brand.package',
    FIRST_CUSTOMERS: 'marketing.firstCampaign',
    OPERATIONS_SETUP: 'ops.setupPackage',
    PRICING: 'finance.pricingPackage',
  };
  return MILESTONE_TO_WORKFLOW[milestone];
}

/** Fallback named_title when the LLM omits one. Kid-facing — used only when
 *  the model didn't emit a proper headline. Readable but unmemorable, which
 *  is fine since it's rare. */
function synthNamedTitle(milestone: string | null): string {
  if (!milestone) return "Today's Big Choice";
  const cleaned = milestone
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `The ${cleaned} Call`;
}

/** Drop any weight keys that aren't valid dimensions and clamp values. */
function sanitizeWeights(raw: Record<string, number> | undefined): CeoChoice['weights'] {
  const valid = new Set([
    'risk_calibration',
    'capital_discipline',
    'growth_instinct',
    'operational_rigor',
    'people_leadership',
    'crisis_response',
  ]);
  const out: CeoChoice['weights'] = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!valid.has(k)) continue;
    const num = Number(v);
    if (!Number.isFinite(num)) continue;
    (out as Record<string, number>)[k] = Math.max(-3, Math.min(3, Math.round(num)));
  }
  return out;
}

// ─── Fallback event builder (template-based) ─────────────────────────────

interface TemplateEvent {
  event_type: string;
  category: string;
  title: string;
  content: string;
  choices: Array<{
    id: string;
    text: string;
    scoring_hint: string;
    weights: Record<string, number>;
  }>;
}

const templates = fallbackEvents as unknown as TemplateEvent[];
let fallbackCursor = 0;

/** Pick a template event whose category matches the target milestone's natural
 *  category. Substitutes business name where the template references "your
 *  business" / "your stand" generically. Keeps the queue moving even offline.
 *
 *  Post-PR2: a fallback event still respects eventType — if a milestone was
 *  requested we still return a milestone-typed fallback (with synthesised
 *  named_title + stakes multiplier) so downstream phase-advance logic keeps
 *  working even in the no-LLM degraded mode. */
export function buildFallbackEvent(business: CeoBusiness, milestone: string | null): GeneratedEvent {
  const targetCategory: CeoEventCategory | null = milestone
    ? MILESTONE_FALLBACK_CATEGORY[milestone] ?? null
    : null;

  const matching = targetCategory
    ? templates.filter((t) => t.category === targetCategory)
    : templates;

  const pool = matching.length > 0 ? matching : templates;
  if (pool.length === 0) {
    throw new Error('[ceo/eventEngine] No template events available for fallback');
  }
  const template = pool[fallbackCursor % pool.length]!;
  fallbackCursor += 1;

  // Template content is hand-authored, but `business.businessName` is
  // substituted in — and that string originated from kid/parent input
  // (register route filters at the AppException level). Defensive
  // filterOutput pass so nothing PII-shaped leaks through even in the
  // degraded LLM-off fallback path.
  const description = filterOutput(
    template.content
      .replace(/your business/gi, business.businessName)
      .replace(/your stand/gi, business.businessName)
      .replace(/your shop/gi, business.businessName),
  );

  const choiceIds: readonly CeoChoiceId[] = ['A', 'B', 'C'] as const;
  const choices: CeoChoice[] = template.choices.slice(0, 3).map((c, idx) => ({
    id: choiceIds[idx] ?? 'A',
    text: filterOutput(c.text),
    scoring_hint: filterOutput(c.scoring_hint),
    weights: sanitizeWeights(c.weights),
  }));

  const eventType: CeoEventType = milestone ? 'milestone' : 'regular';
  return {
    businessId: business.id,
    userId: business.userId,
    kidId: business.kidId,
    title: filterOutput(template.title),
    description,
    category: template.category,
    phase: business.phase,
    milestone,
    choices,
    eventType,
    namedTitle:
      eventType === 'milestone' ? filterOutput(synthNamedTitle(milestone)) : undefined,
    stakesMultiplier:
      eventType === 'milestone'
        ? stakesMultiplierFor(milestone)
        : STAKES_MULTIPLIER.regular,
    agentWorkflowId: resolveAgentWorkflowId(eventType, milestone),
  };
}
