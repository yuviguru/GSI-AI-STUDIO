'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * BookTile — the unified compact card used for both:
 *   - Template gallery entries ("Blank book", "Storybook", "Picture Book", …)
 *   - Library book cards (a kid's in-progress / published books)
 *
 * The shape is 140px wide × ~210px tall: a 3:4 thumbnail area on top and a
 * white caption strip below. Designed for horizontal-scrolling rails so the
 * library page can fit many books in the center column without overwhelming
 * any single section with a huge grid.
 *
 * Border radius is `rounded-lg` (8px) to match the Hub's design language —
 * `PlayerCard`, `HeroStage`, `BadgesCard`, `ModeTile` all use the same value.
 *
 * Renders as `<Link>` when `href` is provided, `<button>` when `onClick` is
 * provided, plain `<div>` otherwise. The shape and hover/focus treatment are
 * identical across all three so a row of mixed tiles feels uniform.
 */

interface BookTileProps {
  /** What appears in the thumbnail area — caller renders an emoji, an
   *  `<img>` cover, a `<Plus>` icon, etc. */
  thumbnail: ReactNode;
  /** CSS for the thumbnail background. Accepts a single color, a
   *  `linear-gradient(...)`, or any other `background` value. Passed as the
   *  inline `background` style so tints with theme colors are easy. */
  thumbnailBackground?: string;
  /** Card title (line-clamped to 1 line). */
  title: string;
  /** Optional sub-line under the title (line-clamped to 1 line). Used for
   *  type descriptions on template cards, page counts on book cards. */
  subtitle?: string;
  /** Optional element pinned to the top-right of the thumbnail (e.g. a
   *  Lock icon for drafts, BookOpen icon for published). */
  corner?: ReactNode;
  /** Click handler — when set, renders as a `<button>`. Mutually exclusive
   *  with `href`. */
  onClick?: () => void;
  /** Link target — when set, renders as a Next.js `<Link>`. Mutually
   *  exclusive with `onClick`. */
  href?: string;
  /** Accessible name. Falls back to `title` if not provided. */
  ariaLabel?: string;
  /** Extra classes for the wrapper (rarely needed). */
  className?: string;
}

const TILE_WIDTH = 140;

const WRAPPER_CLASSES =
  'group block shrink-0 overflow-hidden rounded-lg bg-white shadow-card ring-1 ring-white/70 transition-all hover:scale-[1.03] hover:shadow-elevated focus:outline-none focus:ring-2 focus:ring-brand-purple';

export function BookTile({
  thumbnail,
  thumbnailBackground,
  title,
  subtitle,
  corner,
  onClick,
  href,
  ariaLabel,
  className,
}: BookTileProps) {
  const inner = (
    <>
      <div
        className="relative flex aspect-[3/4] w-full items-center justify-center"
        style={thumbnailBackground ? { background: thumbnailBackground } : undefined}
      >
        {thumbnail}
        {corner && <div className="absolute right-1.5 top-1.5">{corner}</div>}
      </div>
      <div className="bg-white px-3 py-2">
        <div className="line-clamp-1 text-xs font-bold text-gray-900 group-hover:text-brand-purple">
          {title}
        </div>
        {subtitle && (
          <div className="line-clamp-1 text-[10px] text-gray-500">{subtitle}</div>
        )}
      </div>
    </>
  );

  const style = { width: TILE_WIDTH };
  const label = ariaLabel ?? title;

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        className={cn(WRAPPER_CLASSES, 'flex flex-col', className)}
        style={style}
      >
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(WRAPPER_CLASSES, 'flex flex-col text-left', className)}
        style={style}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={cn(WRAPPER_CLASSES, 'flex flex-col', className)}
      style={style}
    >
      {inner}
    </div>
  );
}
