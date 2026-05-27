/**
 * Client-safe defaults for the royalty split (BOOK-004 Phase 1).
 *
 * Mirrors the server-side DEFAULTS in `./royaltySplit.ts`. No
 * `process.env` or firebase-admin import so it's safe under `'use client'`.
 *
 * Per the BOOK-004 conversation, the values are placeholders — admin can
 * tune the live numbers via the `config/royaltySplit` Firestore doc once
 * we ship. Keep both files in sync (same dual-file pattern as
 * creditCostsDefaults).
 */

import type { RoyaltySplit, RoyaltySplitConfig } from '@gsi/types';

export const ROYALTY_SPLIT_DEFAULTS: Readonly<RoyaltySplit> = {
  creator: 60,
  kit: 20,
  platform: 20,
};

export const ROYALTY_SPLIT_CONFIG_DEFAULTS: Readonly<RoyaltySplitConfig> = {
  splits: ROYALTY_SPLIT_DEFAULTS,
  currency: 'INR',
};

/** Round-trip safety — never let a UI display a split that sums to !=100. */
export function isValidSplit(split: RoyaltySplit): boolean {
  return Math.round(split.creator + split.kit + split.platform) === 100;
}
