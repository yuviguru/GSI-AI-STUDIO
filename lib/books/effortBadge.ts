/**
 * Effort-badge computation (BOOK-003).
 *
 * Pure functions. Maps a Book.authorship summary to one of four badges:
 *   pure_imagination (< 10% AI) — kid did essentially all of it
 *   co_author        (10-50% AI) — kid and AI collaborated
 *   ai_sidekick      (50-85% AI) — AI helped a lot, kid edited
 *   ai_generated     (>= 85% AI) — AI did the draft, kid left it
 *
 * Weighting: text contributes 70% of the score, images 30% — the kid's
 * voice (their words) matters more than the illustrations. Edge cases
 * (no text, no images) collapse the weights cleanly to whichever signal
 * exists.
 */

import type { BookAuthorship, EffortBadge, EffortBadgeKey } from '@gsi/types';

const TEXT_WEIGHT = 0.7;
const IMAGE_WEIGHT = 0.3;

export interface EffortBadgeMeta {
  key: EffortBadgeKey;
  /** Inclusive lower bound (% AI) for this badge */
  minAiPct: number;
  /** Exclusive upper bound (% AI) for this badge — Infinity for the last */
  maxAiPct: number;
  displayName: string;
  emoji: string;
  /** Tailwind background class for the pill */
  bgClass: string;
  /** Tailwind text-color class for the pill */
  textClass: string;
  /** Tailwind border class */
  borderClass: string;
  /** Kid-facing one-liner shown under the badge */
  tagline: string;
}

export const EFFORT_BADGES: readonly EffortBadgeMeta[] = [
  {
    key: 'pure_imagination',
    minAiPct: 0,
    maxAiPct: 10,
    displayName: 'Pure Imagination',
    emoji: '🧠',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    tagline: 'All you. Wow.',
  },
  {
    key: 'co_author',
    minAiPct: 10,
    maxAiPct: 50,
    displayName: 'Co-Author',
    emoji: '🤝',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-200',
    tagline: 'Real teamwork.',
  },
  {
    key: 'ai_sidekick',
    minAiPct: 50,
    maxAiPct: 85,
    displayName: 'AI Sidekick',
    emoji: '✨',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    tagline: 'AI lent a hand.',
  },
  {
    key: 'ai_generated',
    minAiPct: 85,
    maxAiPct: Infinity,
    displayName: 'AI Generated',
    emoji: '🤖',
    bgClass: 'bg-sky-100',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
    tagline: 'AI did the draft.',
  },
] as const;

export function getEffortBadgeMeta(key: EffortBadgeKey): EffortBadgeMeta {
  return EFFORT_BADGES.find((b) => b.key === key) ?? EFFORT_BADGES[3]!;
}

/**
 * Compute the badge from a Book.authorship summary.
 * Returns a structured EffortBadge ready to persist on the book.
 *
 * `now` is injected so the result is deterministic in tests.
 */
export function computeEffortBadge(
  authorship: BookAuthorship,
  now: Date = new Date(),
): EffortBadge {
  const textTotal = authorship.aiCharTotal + authorship.kidCharTotal;
  const imageTotal = authorship.aiImagePageCount + authorship.kidImagePageCount;

  const textPct = textTotal > 0 ? authorship.aiCharTotal / textTotal : 0;
  const imagePct = imageTotal > 0 ? authorship.aiImagePageCount / imageTotal : 0;

  // Re-weight based on which signals exist. If a book has no text (e.g.,
  // wordless picture book), text weight collapses to 0 and images get
  // full weight — and vice versa. Both empty → 0% AI (Pure Imagination
  // is fair when there's literally nothing in the book yet).
  const hasText = textTotal > 0;
  const hasImage = imageTotal > 0;
  let aiFraction: number;
  if (hasText && hasImage) {
    aiFraction = textPct * TEXT_WEIGHT + imagePct * IMAGE_WEIGHT;
  } else if (hasText) {
    aiFraction = textPct;
  } else if (hasImage) {
    aiFraction = imagePct;
  } else {
    aiFraction = 0;
  }

  const aiPercentage = Math.round(aiFraction * 1000) / 10; // 1 decimal
  const meta = EFFORT_BADGES.find(
    (b) => aiPercentage >= b.minAiPct && aiPercentage < b.maxAiPct,
  ) ?? EFFORT_BADGES[0]!;

  return {
    key: meta.key,
    aiPercentage,
    awardedAt: now,
    breakdown: {
      aiCharTotal: authorship.aiCharTotal,
      kidCharTotal: authorship.kidCharTotal,
      aiImagePageCount: authorship.aiImagePageCount,
      kidImagePageCount: authorship.kidImagePageCount,
    },
  };
}
