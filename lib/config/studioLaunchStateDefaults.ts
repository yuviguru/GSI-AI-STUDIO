/**
 * Client-safe defaults for studio launch states (LAUNCH-001).
 *
 * Mirrors the server-side `DEFAULTS` map in `./studioLaunchState.ts` but
 * with no firebase-admin import — safe to use from `'use client'` modules.
 *
 * The hook (`hooks/useStudioLaunchState.ts`) reads from these defaults
 * synchronously on first render so the LIVE/BETA pill paints without a
 * fetch round-trip; the SWR fetch then upgrades to the Firestore-resolved
 * values when ready.
 *
 * To keep client/server in sync, edit BOTH this file and the server-side
 * `DEFAULTS` map together. Same dual-file pattern as
 * `creditCostsDefaults.ts` / `creditCosts.ts`.
 */

import type { StudioConfig, StudioId, StudioLaunchState } from '@gsi/types';

export const STUDIO_LAUNCH_STATE_DEFAULTS: Readonly<Record<StudioId, StudioConfig>> = {
  book: { launchState: 'live', label: 'Book Studio' },
  story: { launchState: 'beta', label: 'Story Studio' },
  music: { launchState: 'beta', label: 'Music Lab' },
  quiz: { launchState: 'beta', label: 'Quiz Maker' },
  comic: { launchState: 'beta', label: 'Comic Studio' },
  game: { launchState: 'beta', label: 'Game Studio' },
};

/** Client-side launch-state lookup. Returns `'beta'` for unknown ids. */
export function getLaunchStateClient(studioId: string | undefined | null): StudioLaunchState {
  if (!studioId) return 'beta';
  return STUDIO_LAUNCH_STATE_DEFAULTS[studioId as StudioId]?.launchState ?? 'beta';
}
