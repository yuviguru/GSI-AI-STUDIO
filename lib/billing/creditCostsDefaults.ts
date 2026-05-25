/**
 * Client-safe default credit costs.
 *
 * Mirrors the server-side `DEFAULTS` map in `./creditCosts.ts` but with no
 * `process.env` access — safe to import from `'use client'` modules.
 *
 * Server enforcement still applies env overrides at request time; the
 * client uses these defaults to render cost labels INSTANTLY without a
 * fetch round-trip. In the rare case of a mid-promo env override, the
 * label may briefly differ from the server-enforced cost (rare, low-impact).
 *
 * To keep client/server in sync, edit BOTH this file and the server-side
 * `DEFAULTS` map together. A future improvement could codegen one from
 * the other; for now the duplication is a deliberate tradeoff for the
 * instant-render UX.
 */

export const CREDIT_COSTS_DEFAULTS: Readonly<Record<string, number>> = {
  // Story Studio
  'story.generate': 5,
  'story.regeneratePage': 2,

  // Music Studio (Lyria / Replicate MusicGen)
  'music.compose': 15,
  'music.remix': 10,

  // Image generation
  'image.fast': 2,
  'image.flux': 5,
  'image.sdxl': 25,

  // Other studios
  'quiz.generate': 3,
  'game.generate': 8,
  'comic.generate': 10,
  'comic.panel': 4,
  'book.page': 4,
  'book.cover': 6,

  // Beat the AI
  'beatTheAi.round': 1,

  // Character Creator
  'character.generate': 8,

  // Cerebro / MindX
  'cerebro.adaptive': 3,

  // Kid CEO
  'ceo.agentArtifact': 6,
  'ceo.dailyEvent': 2,
};

/** Client-side cost lookup. Returns 0 for features absent from the map. */
export function getCostClient(feature: string | undefined | null): number {
  if (!feature) return 0;
  return CREDIT_COSTS_DEFAULTS[feature] ?? 0;
}
