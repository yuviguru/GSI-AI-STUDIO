/**
 * Studio launch-state types (LAUNCH-001).
 *
 * Drives the LIVE / BETA / COMING_SOON pill on every studio card across
 * the app. Source of truth at runtime is `config/studios` in Firestore;
 * `lib/config/studioLaunchStateDefaults.ts` provides the in-code fallback
 * so the UI paints correctly even if Firestore is unreachable.
 *
 * Scope is the six creation studios. Play-group modes (Kid CEO, MindX,
 * Beat the AI) and Learn-group modes (AI Lab, Explore) keep their own
 * hardcoded `badge` in `components/game-hub/shared/GameModes.ts`.
 */

export type StudioId = 'book' | 'story' | 'music' | 'quiz' | 'comic' | 'game';

export const STUDIO_IDS: readonly StudioId[] = [
  'book',
  'story',
  'music',
  'quiz',
  'comic',
  'game',
] as const;

export type StudioLaunchState = 'live' | 'beta' | 'coming-soon';

export interface StudioConfig {
  launchState: StudioLaunchState;
  /** Display label override. When absent, callers fall back to in-code defaults. */
  label?: string;
}

export interface StudioLaunchConfig {
  studios: Record<StudioId, StudioConfig>;
}

/**
 * Narrow an arbitrary string to StudioId. Returns null for unknown ids so
 * callers can treat the lookup as "missing studio" → no pill.
 */
export function asStudioId(value: string | null | undefined): StudioId | null {
  if (!value) return null;
  return STUDIO_IDS.includes(value as StudioId) ? (value as StudioId) : null;
}

/**
 * Narrow an arbitrary string to StudioLaunchState. Unknown values fall
 * back to `'beta'` — safer than `'live'` for an unrecognised state.
 */
export function asStudioLaunchState(value: unknown): StudioLaunchState {
  if (value === 'live' || value === 'beta' || value === 'coming-soon') return value;
  return 'beta';
}
