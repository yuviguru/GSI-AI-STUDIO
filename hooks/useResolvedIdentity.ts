'use client';

import { useKidProfile } from './useKidProfile';
import { useOnboardingProfile } from './useOnboardingProfile';
import { DEFAULT_MASCOT_ID, getMascot } from '@/lib/mascots/roster';

/**
 * Player identity resolved from the standard precedence chain:
 *   1. Authenticated active kid (`useKidProfile().activeKid`)
 *   2. Anonymous onboarding profile (`useOnboardingProfile().profile`)
 *   3. Defaults (Pixie mascot, "You" name, no avatar)
 *
 * Returned shape is what every hub component wants to render: a name, an
 * optional AI-generated avatar URL (use as `<img src>` when present), the
 * mascot id (for sub-components keyed on it), and the mascot's emoji
 * (visual fallback when no avatar URL).
 *
 * Why a hook: PlayerCard, LeaderboardCard, ProfileScene, RanksScene,
 * TopHud, HeroStage, and HubScene all repeated this exact ternary chain.
 * One hook keeps the precedence (and the defaults) in one place — if we
 * ever add a new identity source (e.g. school-issued account), only this
 * file changes.
 */
export interface ResolvedIdentity {
  /** Display name. `fallbackName` (or 'You') when nothing is set. */
  name: string;
  /** AI-generated avatar URL — prefer this for `<img src>`. Null when only
   *  a mascot is selected (no generated avatar yet). */
  avatarUrl: string | null;
  /** Selected mascot id. Always defined (falls back to DEFAULT_MASCOT_ID). */
  mascotId: string;
  /** Single-grapheme emoji art for the mascot. Use as the visual fallback
   *  when `avatarUrl` is null. */
  mascotEmoji: string;
  /** True when the name came from a real source (activeKid or onboarding
   *  profile), false when we fell through to `fallbackName`. Components
   *  that branch UI on "do we have a real profile?" (e.g. TopHud's
   *  auth-chip variants) check this rather than comparing the name. */
  hasProfile: boolean;
}

interface UseResolvedIdentityOptions {
  /** Name used when neither activeKid nor onboardingProfile has one set.
   *  Defaults to 'You'. Components on a "Guest" path may prefer 'Guest'. */
  fallbackName?: string;
}

export function useResolvedIdentity(
  options: UseResolvedIdentityOptions = {},
): ResolvedIdentity {
  const { activeKid } = useKidProfile();
  const { profile: onboardingProfile } = useOnboardingProfile();
  const fallbackName = options.fallbackName ?? 'You';

  const resolvedName = activeKid?.name ?? onboardingProfile?.name ?? null;
  const name = resolvedName ?? fallbackName;
  const avatarUrl =
    activeKid?.avatarUrl ?? onboardingProfile?.avatarUrl ?? null;
  const mascotId =
    activeKid?.mascotId ?? onboardingProfile?.mascotId ?? DEFAULT_MASCOT_ID;
  const mascotEmoji = getMascot(mascotId).art;

  return { name, avatarUrl, mascotId, mascotEmoji, hasProfile: resolvedName !== null };
}
