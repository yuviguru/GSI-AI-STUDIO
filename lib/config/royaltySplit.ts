/**
 * Royalty split resolver (BOOK-004 Phase 1).
 *
 * Same pattern as `studioLaunchState`: in-code defaults are the safe
 * fallback; the `config/royaltySplit` Firestore doc can override at
 * runtime. Errors are swallowed so a Firestore outage doesn't break
 * sales config UI.
 *
 * Keep `ROYALTY_SPLIT_DEFAULTS` here in sync with the same map in
 * `./royaltySplitDefaults.ts` (client-safe twin).
 */

import { adminDb } from '@gsi/firebase';
import type { RoyaltySplit, RoyaltySplitConfig } from '@gsi/types';

const CONFIG_COLLECTION = 'config';
const ROYALTY_SPLIT_DOC = 'royaltySplit';

const DEFAULTS: Readonly<RoyaltySplit> = {
  creator: 60,
  kit: 20,
  platform: 20,
};

/** Validate a split blob from Firestore. Returns null on any issue so the
 *  caller falls back to defaults. */
function parseSplit(raw: unknown): RoyaltySplit | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const creator = typeof r.creator === 'number' ? r.creator : NaN;
  const kit = typeof r.kit === 'number' ? r.kit : NaN;
  const platform = typeof r.platform === 'number' ? r.platform : NaN;
  if ([creator, kit, platform].some((n) => !Number.isFinite(n) || n < 0 || n > 100)) {
    return null;
  }
  if (Math.round(creator + kit + platform) !== 100) return null;
  return { creator, kit, platform };
}

/**
 * Resolve the live royalty split. Always returns a usable config — never throws.
 */
export async function getRoyaltySplit(): Promise<RoyaltySplitConfig> {
  let override: RoyaltySplit | null = null;
  try {
    const snap = await adminDb.collection(CONFIG_COLLECTION).doc(ROYALTY_SPLIT_DOC).get();
    if (snap.exists) {
      const data = snap.data();
      override = parseSplit(data?.splits);
    }
  } catch (err) {
    console.warn('[royaltySplit] Firestore read failed, using defaults:', err);
  }
  return {
    splits: override ?? DEFAULTS,
    currency: 'INR',
  };
}

/** Pure compute helper — splits a price into INR amounts per recipient. */
export function applyRoyaltySplit(
  priceInr: number,
  split: RoyaltySplit,
): { creator: number; kit: number; platform: number } {
  // Round each share to whole rupees, send any remainder to platform so
  // creator/KIT amounts are predictable (kid won't see fractional paisa).
  const creator = Math.floor((priceInr * split.creator) / 100);
  const kit = Math.floor((priceInr * split.kit) / 100);
  const platform = priceInr - creator - kit;
  return { creator, kit, platform };
}
