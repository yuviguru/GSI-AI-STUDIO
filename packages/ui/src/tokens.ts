/**
 * Responsive design tokens used across the dashboard shell.
 *
 * Touch targets follow Apple HIG / Material guidance (≥ 44×44 px).
 * Safe-area helpers cover iOS notches and home-bar regions when the app
 * runs as an installed PWA.
 */

export const TOUCH_TARGET = 'min-h-[44px] min-w-[44px]';

export const SAFE_TOP = 'pt-[env(safe-area-inset-top,0px)]';
export const SAFE_BOTTOM = 'pb-[env(safe-area-inset-bottom,0px)]';
export const SAFE_LEFT = 'pl-[env(safe-area-inset-left,0px)]';
export const SAFE_RIGHT = 'pr-[env(safe-area-inset-right,0px)]';

/** Maximum content width on huge displays (projector / 4K). */
export const CONTENT_MAX_WIDTH = 'max-w-[1600px]';

/** Standard sidebar widths at icon-only and full state. */
export const SIDEBAR_WIDTH = {
  iconOnly: 72,
  full: 240,
} as const;

/** Right rail target widths at lg / xl / 2xl breakpoints. */
export const RIGHT_RAIL_WIDTH = {
  lg: 300,
  xl: 340,
  '2xl': 380,
} as const;

/** Per-breakpoint image `sizes` attribute helpers for `next/image`. */
export const HERO_IMAGE_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw';

export const TILE_IMAGE_SIZES =
  '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px';
