/**
 * Per-feature credit cost map.
 *
 * Edit one number to reprice an AI call. Features absent from the map cost
 * zero (free actions, e.g. AI X-Ray, voice transcription, grammar checks).
 *
 * Env override pattern: `CREDIT_COST_<KEY_WITH_UNDERSCORES>=<n>`. Example:
 *   CREDIT_COST_IMAGE_SDXL=15      # half-off SDXL for a weekend
 *   CREDIT_COST_STORY_GENERATE=3
 *
 * Default pricing target: ~₹0.15/credit at the Pro tier — see
 * `docs/infra-cost-and-migration-plan.md` for the unit-economics model.
 * Re-derive when provider prices change.
 */

const DEFAULTS: Record<string, number> = {
  // Story Studio
  'story.generate': 5,
  'story.regeneratePage': 2,

  // Music Studio (Lyria / Replicate MusicGen)
  'music.compose': 15,
  'music.remix': 10,

  // Image generation
  'image.fast': 2, // Pollinations / Flux Schnell — free-plan tier
  'image.flux': 5, // Pixazo Flux Schnell — default
  'image.sdxl': 25, // Replicate SDXL — Pro-priority

  // Other studios
  'quiz.generate': 3,
  'game.generate': 8,
  'comic.generate': 10,
  'comic.panel': 4, // per-panel regen
  'book.page': 4, // per-page generation
  'book.cover': 6,
  'book.aiGenerate': 10, // BOOK-002 flat LLM cost (image cost charged separately per page)

  // Beat the AI
  'beatTheAi.round': 1,

  // Character Creator
  'character.generate': 8,

  // Cerebro / MindX adaptive question generation
  'cerebro.adaptive': 3,

  // Kid CEO
  'ceo.agentArtifact': 6,
  'ceo.dailyEvent': 2,
};

function envOverride(feature: string): number | null {
  const raw = process.env[`CREDIT_COST_${feature.toUpperCase().replace(/\./g, '_')}`];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Resolve the cost for a feature. Env override → default → 0. */
export function getCost(feature: string | undefined | null): number {
  if (!feature) return 0;
  return envOverride(feature) ?? DEFAULTS[feature] ?? 0;
}

/** Default catalog snapshot. Re-built per call so env overrides apply live. */
export const CREDIT_COSTS = new Proxy(DEFAULTS, {
  get(target, key: string) {
    return envOverride(key) ?? target[key];
  },
});

/** All known features + their resolved costs, for admin tooling. */
export function listCosts(): Array<{ feature: string; credits: number }> {
  return Object.keys(DEFAULTS).map((feature) => ({ feature, credits: getCost(feature) }));
}
