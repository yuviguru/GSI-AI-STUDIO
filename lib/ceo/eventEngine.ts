/** Kid CEO event generator. Port of SimPrenuer/eventEngine.js with:
 *    - Groq (llama-3.3-70b) primary, Claude (Sonnet) fallback — matches
 *      GSI's existing LLM pipeline. No new clients introduced.
 *    - Template fallback if both providers fail or return malformed JSON.
 *    - Milestone-steered prompts: the LLM is told exactly which beat to
 *      write for, which keeps phase progression reliable even on weaker
 *      models. Milestone names match SimPrenuer so the fallback category
 *      mapping from constants.ts ports cleanly.
 *
 *  Pure event generation only — does NOT write to Firestore. The caller
 *  (API route) passes the generated event to ceoService.saveCeoEvent. */

import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import type { CeoBusiness, CeoChoice, CeoChoiceId, CeoEvent } from '@/types';
import { MILESTONE_FALLBACK_CATEGORY, type CeoEventCategory } from './constants';
import {
  EVENT_GENERATION_PROMPT,
  buildEventPrompt,
  buildMilestonePrompt,
} from './prompts/eventPrompt';
import fallbackEvents from './templates/events.json';

/** Shape the LLM is asked to return. Matches EVENT_GENERATION_PROMPT spec. */
interface LlmEventResponse {
  title: string;
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
 *  (id, status, createdAt, expiresAt, decision fields). */
export interface GeneratedEvent {
  businessId: string;
  sessionId: string;
  title: string;
  description: string;
  category: string;
  phase: CeoBusiness['phase'];
  milestone: string | null;
  choices: CeoChoice[];
}

interface GenerateEventParams {
  business: CeoBusiness;
  milestone?: string | null;
}

/** Main entry. Generates an event — LLM-steered if a milestone is given, else
 *  freeform; falls back to template events on LLM failure. */
export async function generateEvent(params: GenerateEventParams): Promise<GeneratedEvent> {
  const { business, milestone = null } = params;

  const userPrompt = milestone
    ? buildMilestonePrompt(business, milestone)
    : buildEventPrompt(business);

  // 1. Try Groq
  try {
    const raw = await generateJsonWithGroq<LlmEventResponse>({
      systemPrompt: EVENT_GENERATION_PROMPT,
      userMessage: userPrompt,
      temperature: 0.85,
      maxTokens: 1200,
    });
    return shapeLlmEvent(raw, business, milestone);
  } catch (groqErr) {
    console.warn('[ceo/eventEngine] Groq failed, trying Claude:', (groqErr as Error).message);
  }

  // 2. Try Claude
  try {
    const raw = await generateJsonWithClaude<LlmEventResponse>({
      systemPrompt: EVENT_GENERATION_PROMPT,
      userMessage: userPrompt,
      temperature: 0.85,
      maxTokens: 1200,
    });
    return shapeLlmEvent(raw, business, milestone);
  } catch (claudeErr) {
    console.warn('[ceo/eventEngine] Claude failed, using template fallback:', (claudeErr as Error).message);
  }

  // 3. Template fallback
  return buildFallbackEvent(business, milestone);
}

/** Validate + normalize the LLM response into our CeoChoice shape.
 *  The LLM may use "A"/"B"/"C" OR just position — we enforce the tri-choice
 *  contract here. */
function shapeLlmEvent(
  raw: LlmEventResponse,
  business: CeoBusiness,
  milestone: string | null,
): GeneratedEvent {
  if (!raw.title || !raw.category || !raw.content || !Array.isArray(raw.choices) || raw.choices.length !== 3) {
    throw new Error('Invalid event structure from LLM');
  }

  const choiceIds: readonly CeoChoiceId[] = ['A', 'B', 'C'] as const;
  const choices: CeoChoice[] = raw.choices.slice(0, 3).map((c, idx) => ({
    id: choiceIds[idx] ?? 'A',
    text: String(c.text).trim(),
    scoring_hint: String(c.scoring_hint ?? '').trim(),
    weights: sanitizeWeights(c.weights),
  }));

  return {
    businessId: business.id,
    sessionId: business.sessionId,
    title: raw.title.trim(),
    description: raw.content.trim(),
    category: raw.category.trim(),
    phase: business.phase,
    milestone,
    choices,
  };
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
 *  business" / "your stand" generically. Keeps the queue moving even offline. */
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

  const description = template.content
    .replace(/your business/gi, business.businessName)
    .replace(/your stand/gi, business.businessName)
    .replace(/your shop/gi, business.businessName);

  const choiceIds: readonly CeoChoiceId[] = ['A', 'B', 'C'] as const;
  const choices: CeoChoice[] = template.choices.slice(0, 3).map((c, idx) => ({
    id: choiceIds[idx] ?? 'A',
    text: c.text,
    scoring_hint: c.scoring_hint,
    weights: sanitizeWeights(c.weights),
  }));

  return {
    businessId: business.id,
    sessionId: business.sessionId,
    title: template.title,
    description,
    category: template.category,
    phase: business.phase,
    milestone,
    choices,
  };
}
