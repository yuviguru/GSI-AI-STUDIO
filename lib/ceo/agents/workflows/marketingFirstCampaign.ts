/**
 * `marketing.firstCampaign` — Marketing Agent workflow for the
 * FIRST_CUSTOMERS milestone.
 *
 * Produces three poster candidates + two social post copy variants,
 * all grounded in the kid's `business.brandAssets` (voice / motto)
 * when present so the campaign stays on-brand across every run.
 *
 * Decisions (from KIDCEO-PHASE-3-DECISIONS.md):
 *   - Marketing Agent unlocks at Launch phase (C1).
 *   - 3 poster candidates, 2 post variants (B2/B3 mirror).
 *   - Brief = 3-field hybrid: offer (MC) + vibe (MC) + hook (free-text).
 */

import type { CeoBusiness } from '@/types';
import { filterInput, filterOutput } from '@/lib/safety/inputFilter';
import { registerWorkflow, type AnyWorkflowSpec } from './registry';
import type { WorkflowSpec, WorkflowStep } from '../executor';
import type { ClaudeToolInput, ClaudeToolOutput } from '../tools/claude';
import type { FluxSchnellInput, FluxSchnellOutput } from '../tools/fluxSchnell';

export const CAMPAIGN_OFFERS = ['discount', 'freebie', 'premium'] as const;
export type CampaignOffer = (typeof CAMPAIGN_OFFERS)[number];

export const CAMPAIGN_VIBES = ['energetic', 'warm', 'clever'] as const;
export type CampaignVibe = (typeof CAMPAIGN_VIBES)[number];

const HOOK_MAX_CHARS = 25;

export interface FirstCampaignBrief {
  offer: CampaignOffer;
  vibe: CampaignVibe;
  hook: string;
}

interface CampaignBriefExpansion {
  visualDirection: string;
  posterPrompts: [string, string, string];
  postDirection: string;
}

interface CampaignPostsOutput {
  short: string;
  long: string;
}

function validateBrief(brief: unknown): asserts brief is FirstCampaignBrief {
  if (!brief || typeof brief !== 'object') {
    throw new Error('marketing.firstCampaign: brief must be an object');
  }
  const b = brief as Record<string, unknown>;
  if (!CAMPAIGN_OFFERS.includes(b.offer as CampaignOffer)) {
    throw new Error(
      `marketing.firstCampaign: offer must be one of ${CAMPAIGN_OFFERS.join(', ')}`,
    );
  }
  if (!CAMPAIGN_VIBES.includes(b.vibe as CampaignVibe)) {
    throw new Error(
      `marketing.firstCampaign: vibe must be one of ${CAMPAIGN_VIBES.join(', ')}`,
    );
  }
  if (typeof b.hook !== 'string' || b.hook.trim().length === 0) {
    throw new Error('marketing.firstCampaign: hook is required');
  }
  if (b.hook.length > HOOK_MAX_CHARS) {
    throw new Error(`marketing.firstCampaign: hook must be ≤ ${HOOK_MAX_CHARS} characters`);
  }
  filterInput(b.hook);
}

function offerLabel(o: CampaignOffer): string {
  switch (o) {
    case 'discount':
      return 'a limited-time discount';
    case 'freebie':
      return 'a freebie for first-time customers';
    case 'premium':
      return 'a premium upgrade for regulars';
  }
}

// ─── Step 1 — brief expansion ─────────────────────────────

const briefExpansionStep: WorkflowStep<ClaudeToolInput, ClaudeToolOutput> = {
  id: 'campaign_brief_expansion',
  tool: 'claude_haiku',
  required: true,
  prepareInput: (ctx) => {
    const business = ctx.business as CeoBusiness;
    const brief = ctx.brief as FirstCampaignBrief;
    const brandBlock = business.brandAssets
      ? `Brand voice: ${business.brandAssets.voice}\nMotto: "${business.brandAssets.motto}"\n`
      : '';
    const systemPrompt =
      `You are a marketing planner for a kid's small business. The kid is ` +
      `10-17 years old, running "${business.businessName}" (${business.businessType}) ` +
      `in ${business.location}. Offer: ${offerLabel(brief.offer)}. Vibe: ${brief.vibe}.\n` +
      `${brandBlock}\n` +
      `Return JSON (no markdown):\n` +
      `{\n` +
      `  "visualDirection": string,   // one sentence on what the posters should look like\n` +
      `  "posterPrompts": [string,string,string],  // 3 distinct image prompts, ~30 words each,\n` +
      `                             // exploring different angles (bold type / product-hero / customer-scene)\n` +
      `  "postDirection": string    // one sentence on how the caption copy should read\n` +
      `}`;
    const userMessage = `Kid's hook: "${brief.hook}"`;
    return { systemPrompt, userMessage, json: true, maxTokens: 600, temperature: 0.85 };
  },
};

// ─── Step 2..4 — three poster candidates ─────────────────

function makePosterStep(index: 0 | 1 | 2): WorkflowStep<FluxSchnellInput, FluxSchnellOutput> {
  return {
    id: `campaign_poster_${index}`,
    tool: 'flux_schnell',
    unitCount: 1,
    required: index === 0,
    prepareInput: (ctx) => {
      const exp = (ctx.campaign_brief_expansion as ClaudeToolOutput).json as CampaignBriefExpansion;
      return {
        prompt: exp?.posterPrompts?.[index] ?? 'promotional poster, bright and friendly',
        style: 'cartoon',
        width: 768,
        height: 512,
      };
    },
    toAssets: (output) => [
      {
        type: 'image',
        kind: 'poster',
        url: (output as FluxSchnellOutput).url,
        caption: `Poster option ${index + 1}`,
        altText: filterOutput(`Campaign poster ${index + 1}`),
        widthPx: (output as FluxSchnellOutput).widthPx,
        heightPx: (output as FluxSchnellOutput).heightPx,
      },
    ],
  };
}

// ─── Step 5 — social posts ────────────────────────────────

const socialPostsStep: WorkflowStep<ClaudeToolInput, ClaudeToolOutput> = {
  id: 'campaign_posts',
  tool: 'claude_haiku',
  required: true,
  prepareInput: (ctx) => {
    const business = ctx.business as CeoBusiness;
    const brief = ctx.brief as FirstCampaignBrief;
    const exp =
      ((ctx.campaign_brief_expansion as ClaudeToolOutput).json as CampaignBriefExpansion | null) ??
      null;
    const brandBlock = business.brandAssets
      ? `Brand voice: ${business.brandAssets.voice}\nMotto: "${business.brandAssets.motto}"\n`
      : '';
    const systemPrompt =
      `You are a kid-friendly copywriter. Write two caption variants for ` +
      `${business.businessName} (${business.businessType}) promoting ${offerLabel(brief.offer)}.\n` +
      `Vibe: ${brief.vibe}.\n${brandBlock}\n` +
      `${exp ? `Post direction: ${exp.postDirection}\n` : ''}` +
      `Return JSON (no markdown):\n` +
      `{\n` +
      `  "short": string,  // ≤ 30 words, punchy\n` +
      `  "long":  string   // ≤ 80 words, warmer, still kid-safe\n` +
      `}`;
    const userMessage = `Kid's hook: "${brief.hook}"`;
    return { systemPrompt, userMessage, json: true, maxTokens: 400, temperature: 0.85 };
  },
  toAssets: (output) => {
    const out = ((output as ClaudeToolOutput).json as CampaignPostsOutput | null) ?? null;
    if (!out) return [];
    const assets: Array<{ type: 'text'; kind: 'post'; content: string }> = [];
    const short = filterOutput(String(out.short ?? '')).slice(0, 240);
    const long = filterOutput(String(out.long ?? '')).slice(0, 480);
    if (short) assets.push({ type: 'text', kind: 'post', content: short });
    if (long) assets.push({ type: 'text', kind: 'post', content: long });
    return assets;
  },
};

// ─── Spec ─────────────────────────────────────────────────

export const MARKETING_FIRST_CAMPAIGN_WORKFLOW: WorkflowSpec<FirstCampaignBrief> = {
  id: 'marketing.firstCampaign',
  agentId: 'marketing',
  validateBrief,
  steps: [
    briefExpansionStep,
    makePosterStep(0),
    makePosterStep(1),
    makePosterStep(2),
    socialPostsStep,
  ] as ReadonlyArray<WorkflowStep<unknown, unknown>>,
};

registerWorkflow(MARKETING_FIRST_CAMPAIGN_WORKFLOW as unknown as AnyWorkflowSpec);
