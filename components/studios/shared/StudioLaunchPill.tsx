'use client';

import { useStudioLaunchState } from '@/hooks/useStudioLaunchState';
import type { StudioId } from '@gsi/types';

type Size = 'xs' | 'sm' | 'md';

interface StudioLaunchPillProps {
  studioId: StudioId | string;
  /** Text size variant. `xs` is meant for inline use on tiny tiles
   *  (mobile hub PortalCard); `sm` is the default; `md` for hero cards. */
  size?: Size;
  /** When true, render an emerald "LIVE" pill on live studios instead of
   *  hiding the pill. Default `false` — live is the baseline, no pill is
   *  cleanest. Opt in on marketing-flavoured surfaces (FeaturedStudioCard). */
  showLive?: boolean;
  /** Optional extra classes (e.g. positioning). */
  className?: string;
}

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'px-1 py-0 text-[7px] tracking-wider border',
  sm: 'px-1.5 py-0.5 text-[10px] tracking-wide border',
  md: 'px-2 py-0.5 text-xs tracking-wide border',
};

/**
 * Renders the LIVE / BETA / COMING SOON pill for a studio (LAUNCH-001).
 *
 * Returns `null` when the resolved state warrants no visible pill, so
 * callers don't need to branch. Default behaviour hides the LIVE pill
 * (live = baseline); pass `showLive` to opt in.
 *
 * Backed by `useStudioLaunchState`, which falls back to in-code defaults
 * instantly — the pill paints on first frame with no flicker.
 */
export function StudioLaunchPill({
  studioId,
  size = 'sm',
  showLive = false,
  className,
}: StudioLaunchPillProps) {
  const state = useStudioLaunchState(studioId);

  if (state === 'live' && !showLive) return null;

  const base = `inline-flex items-center justify-center rounded-full font-extrabold uppercase ${SIZE_CLASSES[size]}`;

  if (state === 'live') {
    return (
      <span
        className={`${base} border-emerald-200 bg-emerald-100 text-emerald-700 ${className ?? ''}`}
        aria-label="Live"
      >
        LIVE
      </span>
    );
  }

  if (state === 'beta') {
    return (
      <span
        className={`${base} border-amber-200 bg-amber-100 text-amber-700 ${className ?? ''}`}
        aria-label="Beta"
      >
        BETA
      </span>
    );
  }

  // coming-soon
  return (
    <span
      className={`${base} border-gray-200 bg-gray-100 text-gray-500 ${className ?? ''}`}
      aria-label="Coming soon"
    >
      Coming Soon
    </span>
  );
}
