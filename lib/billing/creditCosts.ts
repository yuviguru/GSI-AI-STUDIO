/**
 * Per-feature credit cost map.
 *
 * Edit ONE number to reprice an AI call. The guard reads this when an API
 * route calls `assertEntitled(authCtx, { feature: 'image.sdxl' })`. The
 * cost is debited atomically with a `debit` ledger entry.
 *
 * Convention: feature keys are `<domain>.<action>` (e.g. `story.generate`,
 * `image.sdxl`). Use the same key on every server route that performs the
 * same kind of work so we can analyze cost per feature later.
 *
 * What costs credits (decision per BILLING-001):
 *   ✅ Creative AI generation — story, music, image, quiz, book pages, comic
 *      panels, beat-the-AI rounds, character creation
 *   ❌ AI X-Ray explanations
 *   ❌ Learn-tab content (lesson generation for AI Lab)
 *   ❌ Voice transcription (Whisper)
 *   ❌ Grammar checks (Groq, cheap and pedagogical)
 *   ❌ Mascot/avatar greetings, hint generation in homework helper
 *
 * Aligns with the product's "AI literacy first" positioning: never gate
 * the *learning* surface, only the *making* surface.
 *
 * Pricing methodology (rough, May 2026):
 *   1 credit ≈ ₹0.15 cost. So:
 *     story.generate (~5 credits) = ₹0.75 LLM + image cost — close to break-even
 *     image.sdxl (~25 credits) = ₹3.75 — premium SDXL ~$0.04/img
 *     music.compose (~15 credits) = ₹2.25 — Lyria/Replicate MusicGen
 *   Pro tier (2,000 credits @ ₹299) prices a heavy user at ~₹0.15/credit which
 *   covers cost + margin. Free tier (50 credits) is the trial generous bucket.
 *
 *   Re-derive whenever provider prices change. See
 *   `docs/infra-cost-and-migration-plan.md` for the full unit-economics model.
 *
 * Env overrides for promo / experiment:
 *   CREDIT_COST_IMAGE_SDXL=15      # half-off SDXL for a weekend
 *   CREDIT_COST_STORY_GENERATE=3   # cheaper story generation during a launch
 */

function envCost(key: string, fallback: number): number {
  const raw = process.env[`CREDIT_COST_${key.toUpperCase().replace(/\./g, '_')}`];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Feature → cost in credits. A feature absent from this map costs zero
 * (treated as a free action). Keep this list aligned with route names so
 * grep `'image.sdxl'` finds both the cost row here and the route that
 * declares it.
 */
export const CREDIT_COSTS: Record<string, number> = {
  // ── Story Studio ───────────────────────────────────────────────────
  'story.generate': envCost('story.generate', 5),
  'story.regeneratePage': envCost('story.regeneratePage', 2),

  // ── Music Studio (Lyria / Replicate MusicGen) ──────────────────────
  'music.compose': envCost('music.compose', 15),
  'music.remix': envCost('music.remix', 10),

  // ── Image generation (used by Story, Comic, Character Creator) ─────
  /** Free/fast tier: Pollinations or Flux Schnell. Used for free-plan users. */
  'image.fast': envCost('image.fast', 2),
  /** Pixazo Flux Schnell — slightly higher quality, still cheap. */
  'image.flux': envCost('image.flux', 5),
  /** Replicate SDXL — premium quality. Pro tier preferred provider. */
  'image.sdxl': envCost('image.sdxl', 25),

  // ── Quiz Studio ────────────────────────────────────────────────────
  'quiz.generate': envCost('quiz.generate', 3),

  // ── Game Studio ────────────────────────────────────────────────────
  'game.generate': envCost('game.generate', 8),

  // ── Comic Studio ───────────────────────────────────────────────────
  'comic.generate': envCost('comic.generate', 10),
  /** Per-panel regeneration. Comics have 3-6 panels per page. */
  'comic.panel': envCost('comic.panel', 4),

  // ── Book Studio ────────────────────────────────────────────────────
  /** Per-page generation (text + optional image). Cheaper than a one-shot
   *  story because the kid is in the driver's seat and we want to encourage
   *  longer authoring sessions. */
  'book.page': envCost('book.page', 4),
  /** Re-generate the cover (front + back composition). */
  'book.cover': envCost('book.cover', 6),

  // ── Beat the AI (LEARN-001 / ENGAGE-004) ───────────────────────────
  /** AI generates a competing response. Cheap because it's small text. */
  'beatTheAi.round': envCost('beatTheAi.round', 1),

  // ── Character Creator (STUDIO-006) ─────────────────────────────────
  /** AI-assisted character generation (prompt → portrait + description). */
  'character.generate': envCost('character.generate', 8),

  // ── Cerebro / MindX (assessment-as-creation hybrid) ────────────────
  /** Cerebro adaptive question generation per assessment session. */
  'cerebro.adaptive': envCost('cerebro.adaptive', 3),

  // ── Kid CEO ────────────────────────────────────────────────────────
  /** CEO agent artifact generation (logo, poster, schedule, etc.). */
  'ceo.agentArtifact': envCost('ceo.agentArtifact', 6),
  /** CEO daily event generation (LLM-narrated business event). */
  'ceo.dailyEvent': envCost('ceo.dailyEvent', 2),
};

/**
 * Look up the credit cost for a feature. Unknown features cost 0 — letting
 * the guard short-circuit cleanly for routes that don't yet have a price.
 *
 * Returns 0 for free-by-design features (AI X-Ray etc.) — they're simply
 * not present in the map and don't need to be.
 */
export function getCost(feature: string | undefined | null): number {
  if (!feature) return 0;
  return CREDIT_COSTS[feature] ?? 0;
}

/**
 * Iterate every known feature → cost. Useful for admin tooling that wants
 * to render a "pricing table" of AI operations.
 */
export function listCosts(): Array<{ feature: string; credits: number }> {
  return Object.entries(CREDIT_COSTS).map(([feature, credits]) => ({ feature, credits }));
}
