/**
 * `brand.package` — Design Agent workflow for the BRAND milestone.
 *
 * Produces three logo candidates + three motto candidates + one brand
 * voice description, all generated from a kid's 3-field briefing:
 *   - mood (MC, 9 options: playful / serious / bold / dreamy / mysterious
 *          / warm / clean / retro / energetic) — decision B4
 *   - audience (MC: kids_my_age / family / neighbours / school)
 *   - oneWord (free-text ≤20 chars) — decision B5
 *
 * Steps (B2/B3):
 *   1. brief_expansion (Claude Haiku) — briefing → structured design
 *      brief JSON (visual style, color palette hint, tagline direction).
 *   2. logo_candidates (Flux Schnell × 3) — three logo images derived
 *      from the brief.
 *   3. motto_and_voice (Claude Haiku) — three motto candidates + one
 *      brand-voice sentence.
 */

import type { CeoBusiness } from '@gsi/types';
import { filterInput, filterOutput } from '@/lib/safety/inputFilter';
import { registerWorkflow, type AnyWorkflowSpec } from './registry';
import type { WorkflowSpec, WorkflowStep } from '../executor';
import type { ClaudeToolInput, ClaudeToolOutput } from '../tools/claude';
import type { FluxSchnellInput, FluxSchnellOutput } from '../tools/fluxSchnell';

export const BRAND_MOODS = [
  'playful',
  'serious',
  'bold',
  'dreamy',
  'mysterious',
  'warm',
  'clean',
  'retro',
  'energetic',
] as const;
export type BrandMood = (typeof BRAND_MOODS)[number];

export const BRAND_AUDIENCES = [
  'kids_my_age',
  'family',
  'neighbours',
  'school',
] as const;
export type BrandAudience = (typeof BRAND_AUDIENCES)[number];

export interface BrandBrief {
  mood: BrandMood;
  audience: BrandAudience;
  oneWord: string;
}

export interface BriefExpansionOutput {
  visualStyle: string;
  palette: string[];
  taglineDirection: string;
  logoPrompts: [string, string, string];
}

interface MottoAndVoiceOutput {
  mottos: [string, string, string];
  voice: string;
}

function validateBrief(brief: unknown): asserts brief is BrandBrief {
  if (!brief || typeof brief !== 'object') {
    throw new Error('brand.package: brief must be an object');
  }
  const b = brief as Record<string, unknown>;
  if (!BRAND_MOODS.includes(b.mood as BrandMood)) {
    throw new Error(`brand.package: mood must be one of ${BRAND_MOODS.join(', ')}`);
  }
  if (!BRAND_AUDIENCES.includes(b.audience as BrandAudience)) {
    throw new Error(`brand.package: audience must be one of ${BRAND_AUDIENCES.join(', ')}`);
  }
  if (typeof b.oneWord !== 'string' || b.oneWord.trim().length === 0) {
    throw new Error('brand.package: oneWord is required');
  }
  if (b.oneWord.length > 20) {
    throw new Error('brand.package: oneWord must be ≤ 20 characters');
  }
  // Safety filter — any PII-shaped content in the free-text field gets
  // redacted before it hits the LLM.
  filterInput(b.oneWord);
}

function audienceLabel(a: BrandAudience): string {
  switch (a) {
    case 'kids_my_age':
      return 'kids my age';
    case 'family':
      return 'families';
    case 'neighbours':
      return 'my neighbourhood';
    case 'school':
      return 'my school';
  }
}

// ─── Step 1 — brief expansion ─────────────────────────────

const briefExpansionStep: WorkflowStep<ClaudeToolInput, ClaudeToolOutput> = {
  id: 'brief_expansion',
  tool: 'claude_haiku',
  required: true,
  prepareInput: (ctx) => {
    const brief = ctx.brief as BrandBrief;
    const business = ctx.business as CeoBusiness;
    const systemPrompt =
      `You are a brand-identity designer briefing an illustrator and a copywriter ` +
      `for a kid's small business. The kid is 10-17 years old, running a ` +
      `${business.businessType} called "${business.businessName}" in ${business.location}. ` +
      `Keep everything India-context appropriate, kid-safe, and inclusive.\n\n` +
      `Produce a compact design brief as valid JSON with this shape:\n` +
      `{\n` +
      `  "visualStyle": string,   // one sentence — overall look & feel\n` +
      `  "palette": [string,string,string],  // 3 hex colours matching the mood\n` +
      `  "taglineDirection": string,   // one sentence — tone for mottos\n` +
      `  "logoPrompts": [string, string, string]   // three distinct image prompts,\n` +
      `                             // each about 25-35 words, each exploring a ` +
      `different angle (minimalist / illustrative / typographic for example).\n` +
      `}\n\n` +
      `No markdown, no preamble. Just the JSON.`;
    const userMessage = [
      `Business: ${business.businessName} (${business.businessType})`,
      `Location: ${business.location}`,
      `Mood: ${brief.mood}`,
      `Audience: ${audienceLabel(brief.audience)}`,
      `One word the kid picked: "${brief.oneWord}"`,
    ].join('\n');
    return { systemPrompt, userMessage, json: true, maxTokens: 600, temperature: 0.8 };
  },
};

// ─── Step 2 — 3 logo candidates ──────────────────────────

const logoCandidatesStep: WorkflowStep<
  FluxSchnellInput,
  FluxSchnellOutput
> = {
  id: 'logo_candidate_0',
  tool: 'flux_schnell',
  unitCount: 1,
  required: true,
  prepareInput: (ctx) => {
    const be = (ctx.brief_expansion as ClaudeToolOutput).json as BriefExpansionOutput;
    return {
      prompt: be?.logoPrompts?.[0] ?? 'playful kid-business logo',
      style: 'cartoon',
      width: 512,
      height: 512,
    };
  },
  toAssets: (output) => [
    {
      type: 'image',
      kind: 'logo',
      url: (output as FluxSchnellOutput).url,
      caption: 'Logo option 1',
      altText: filterOutput('Logo concept 1'),
      widthPx: (output as FluxSchnellOutput).widthPx,
      heightPx: (output as FluxSchnellOutput).heightPx,
    },
  ],
};

const logoCandidatesStep1: WorkflowStep<
  FluxSchnellInput,
  FluxSchnellOutput
> = {
  id: 'logo_candidate_1',
  tool: 'flux_schnell',
  unitCount: 1,
  required: false,
  prepareInput: (ctx) => {
    const be = (ctx.brief_expansion as ClaudeToolOutput).json as BriefExpansionOutput;
    return {
      prompt: be?.logoPrompts?.[1] ?? 'clean kid-business logo',
      style: 'cartoon',
      width: 512,
      height: 512,
    };
  },
  toAssets: (output) => [
    {
      type: 'image',
      kind: 'logo',
      url: (output as FluxSchnellOutput).url,
      caption: 'Logo option 2',
      altText: filterOutput('Logo concept 2'),
      widthPx: (output as FluxSchnellOutput).widthPx,
      heightPx: (output as FluxSchnellOutput).heightPx,
    },
  ],
};

const logoCandidatesStep2: WorkflowStep<
  FluxSchnellInput,
  FluxSchnellOutput
> = {
  id: 'logo_candidate_2',
  tool: 'flux_schnell',
  unitCount: 1,
  required: false,
  prepareInput: (ctx) => {
    const be = (ctx.brief_expansion as ClaudeToolOutput).json as BriefExpansionOutput;
    return {
      prompt: be?.logoPrompts?.[2] ?? 'bold kid-business logo',
      style: 'cartoon',
      width: 512,
      height: 512,
    };
  },
  toAssets: (output) => [
    {
      type: 'image',
      kind: 'logo',
      url: (output as FluxSchnellOutput).url,
      caption: 'Logo option 3',
      altText: filterOutput('Logo concept 3'),
      widthPx: (output as FluxSchnellOutput).widthPx,
      heightPx: (output as FluxSchnellOutput).heightPx,
    },
  ],
};

// ─── Step 3 — motto + voice ──────────────────────────────

const mottoAndVoiceStep: WorkflowStep<ClaudeToolInput, ClaudeToolOutput> = {
  id: 'motto_and_voice',
  tool: 'claude_haiku',
  required: true,
  prepareInput: (ctx) => {
    const business = ctx.business as CeoBusiness;
    const brief = ctx.brief as BrandBrief;
    const expansion =
      (ctx.brief_expansion as ClaudeToolOutput).json as BriefExpansionOutput | null;
    const systemPrompt =
      `You are a kid-friendly copywriter for a small Indian business. ` +
      `Produce three motto candidates + one brand-voice description for ` +
      `"${business.businessName}" (${business.businessType}).\n\n` +
      `Each motto should be ≤ 7 words, rhyme-free, mood-matching, and ` +
      `appropriate for Indian English + Hindi-speaking kids/families.\n\n` +
      `Return valid JSON (no markdown):\n` +
      `{\n` +
      `  "mottos": [string, string, string],\n` +
      `  "voice": string   // 2 sentences describing how the brand talks — ` +
      `tone, cadence, key words it would use\n` +
      `}`;
    const userMessage = [
      `Mood: ${brief.mood}`,
      `Audience: ${audienceLabel(brief.audience)}`,
      `Tagline direction: ${expansion?.taglineDirection ?? '(not provided)'}`,
      `Kid's one word: "${brief.oneWord}"`,
    ].join('\n');
    return { systemPrompt, userMessage, json: true, maxTokens: 400, temperature: 0.85 };
  },
  toAssets: (output) => {
    const mav = ((output as ClaudeToolOutput).json as MottoAndVoiceOutput | null) ?? null;
    if (!mav) return [];
    const assets: ReturnType<typeof buildMottoAssets> = buildMottoAssets(mav);
    return assets;
  },
};

function buildMottoAssets(mav: MottoAndVoiceOutput) {
  const assets: Array<
    | { type: 'text'; kind: 'motto'; content: string }
    | { type: 'text'; kind: 'voice'; content: string }
  > = [];
  for (const m of mav.mottos ?? []) {
    const safe = filterOutput(String(m)).slice(0, 120);
    if (safe) assets.push({ type: 'text', kind: 'motto', content: safe });
  }
  const voice = filterOutput(String(mav.voice ?? '')).slice(0, 240);
  if (voice) assets.push({ type: 'text', kind: 'voice', content: voice });
  return assets;
}

// ─── Spec ────────────────────────────────────────────────

export const BRAND_PACKAGE_WORKFLOW: WorkflowSpec<BrandBrief> = {
  id: 'brand.package',
  agentId: 'design',
  validateBrief,
  steps: [
    briefExpansionStep,
    logoCandidatesStep,
    logoCandidatesStep1,
    logoCandidatesStep2,
    mottoAndVoiceStep,
  ] as ReadonlyArray<WorkflowStep<unknown, unknown>>,
};

// Side-effect on import — registers the spec so the executor can find it.
registerWorkflow(BRAND_PACKAGE_WORKFLOW as unknown as AnyWorkflowSpec);
