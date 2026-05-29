/**
 * Authorship math for BOOK-002 + BOOK-003.
 *
 * Pure functions — no Firestore I/O. Callable from anywhere.
 *
 * Per-page model:
 *   - `originalAiText` is snapshotted at page creation for AI-generated pages
 *   - On every save we recompute aiCharCount = LCS(originalAiText, currentText)
 *   - kidCharCount = max(0, currentText.length - aiCharCount)
 *   - source flips: 'ai_generated' (kidCharCount === 0) → 'mixed' (kidCharCount > 0)
 *
 * This is honest: if the kid replaces AI text with their own words of similar
 * length, LCS drops sharply and the AI share decays correctly. If the kid
 * keeps the AI text and just adds more, the LCS stays high and kidCharCount
 * captures only the added chars.
 */

import type {
  AuthorshipSource,
  ImageAuthorshipSource,
  PageAuthorship,
} from '@gsi/types';

/** Longest-common-subsequence character count. O(m*n) time, O(n) space.
 *  For typical page lengths (50-500 chars) this is fast enough on every save. */
export function lcsLength(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;
  // 1D DP — keep previous row implicitly with `prev` scalar
  const dp = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    let prev = 0;
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]!;
      if (ac === b.charCodeAt(j - 1)) {
        dp[j] = prev + 1;
      } else {
        dp[j] = Math.max(dp[j]!, dp[j - 1]!);
      }
      prev = temp;
    }
  }
  return dp[n]!;
}

export interface RecomputePageAuthorshipInput {
  /** The current page's existing authorship (null for legacy pages). */
  existing: PageAuthorship | null;
  /** The page's new plainText after this save. */
  newPlainText: string;
  /** When the save happened. */
  now: Date;
  /** Optional override for imageSource if the save also touched the image. */
  imageSource?: ImageAuthorshipSource;
}

/** Compute the new per-page authorship after a save. Pure. */
export function recomputePageAuthorship({
  existing,
  newPlainText,
  now,
  imageSource,
}: RecomputePageAuthorshipInput): PageAuthorship {
  // Default for legacy pages with no authorship field: treat as kid_written.
  const base: PageAuthorship = existing ?? {
    source: 'kid_written',
    originalAiText: '',
    aiCharCount: 0,
    kidCharCount: 0,
    imageSource: 'none',
    lastEditedAt: now,
  };

  const length = newPlainText.length;
  let aiCharCount: number;
  let source: AuthorshipSource;

  if (base.originalAiText.length === 0) {
    // Kid-written page. AI share stays 0.
    aiCharCount = 0;
    source = 'kid_written';
  } else {
    // AI-seeded page. Recompute surviving AI chars from LCS.
    aiCharCount = lcsLength(base.originalAiText, newPlainText);
    const kidWroteSomething = length - aiCharCount > 0;
    source = kidWroteSomething ? 'mixed' : 'ai_generated';
  }

  const kidCharCount = Math.max(0, length - aiCharCount);

  return {
    source,
    originalAiText: base.originalAiText,
    aiCharCount,
    kidCharCount,
    imageSource: imageSource ?? base.imageSource,
    lastEditedAt: now,
  };
}

export interface AggregateBookAuthorshipInput {
  pages: Array<{ authorship: PageAuthorship | null }>;
  initialSource: 'ai_generated' | 'wizard_blank' | 'wizard_seeded';
  now: Date;
}

/** Re-compute the denormalized book-level authorship summary. Used after
 *  any page write so the publish-time effort badge lookup is a single read. */
export function aggregateBookAuthorship({
  pages,
  initialSource,
  now,
}: AggregateBookAuthorshipInput) {
  let aiCharTotal = 0;
  let kidCharTotal = 0;
  let aiImagePageCount = 0;
  let kidImagePageCount = 0;
  for (const p of pages) {
    const a = p.authorship;
    if (!a) continue;
    aiCharTotal += a.aiCharCount;
    kidCharTotal += a.kidCharCount;
    if (a.imageSource === 'ai_generated') aiImagePageCount++;
    else if (a.imageSource === 'kid_added') kidImagePageCount++;
  }
  return {
    initialSource,
    aiCharTotal,
    kidCharTotal,
    aiImagePageCount,
    kidImagePageCount,
    updatedAt: now,
  };
}
