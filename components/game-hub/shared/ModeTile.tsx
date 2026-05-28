'use client';

import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { STUDIO_IDS, type StudioId } from '@gsi/types';
import { playSound } from '@/lib/sounds';
import { StudioLaunchPill } from '@/components/studios/shared/StudioLaunchPill';
import type { GameMode } from './GameModes';
import type { TileShape } from './bento';

/** True if the mode is one of the six creation studios driven by the
 *  config/studios launch-state document (LAUNCH-001). Play / Learn group
 *  modes (Kid CEO, MindX, Beat the AI, AI Lab, Explore) fall through to
 *  the legacy hardcoded `mode.badge` so their existing LIVE/NEW labels
 *  keep working. */
function isStudioMode(key: string): key is StudioId {
  return (STUDIO_IDS as readonly string[]).includes(key);
}

interface ModeTileProps {
  mode: GameMode;
  /** 'desktop' = full label + tagline, 'mobile' = label only (compact) */
  variant?: 'desktop' | 'mobile';
  /** Foreground layout — derived from the bento cell shape. */
  shape?: TileShape;
  /** Extra classes for the tile root — used for bento grid spans. */
  className?: string;
}

export function ModeTile({
  mode,
  variant = 'desktop',
  shape = 'single',
  className = '',
}: ModeTileProps) {
  const router = useRouter();
  const Icon = mode.icon;
  const compact = variant === 'mobile';
  const prefersReducedMotion = useReducedMotion();

  const handleClick = () => {
    playSound('buttonTap');
    router.push(mode.href);
  };

  const baseClasses = `game-mode-tile group relative flex cursor-pointer overflow-hidden rounded-lg shadow-tile transition-shadow duration-300 text-left ${className}`;

  // ── Hover: bouncy "pop" with a clean neutral elevation shadow ────────────
  //   • Bouncy spring pop (overshoots ~1.06 then settles at 1.04) reads as a
  //     collectible game card jumping off the grid.
  //   • Shadow is neutral dark — soft + deep, no colored tint — so the lift
  //     feels premium instead of toy-coloured. The per-mode glowColor field
  //     remains in GameModes.ts (unused here, kept for future use).
  //   • Image inside zooms 1.08, CTA pops + rotates (see ctaEl below).
  //   • prefers-reduced-motion drops the pop; only the shadow swaps.
  const restingShadow =
    '0 8px 22px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)';
  const hoverShadow =
    '0 22px 44px rgba(15, 23, 42, 0.14), 0 8px 16px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)';

  const buttonProps = {
    whileHover: prefersReducedMotion
      ? { boxShadow: hoverShadow }
      : { scale: 1.04, y: -6, boxShadow: hoverShadow },
    whileTap: { scale: 0.97 } as const,
    transition: {
      type: 'spring' as const,
      stiffness: 340,
      damping: 14, // low damping → bouncy overshoot ("game card" feel)
      mass: 0.6,
    },
    onClick: handleClick,
    style: { background: '#FFFFFF', boxShadow: restingShadow },
    'aria-label': mode.label,
  };

  /** Common badge — positioned absolutely so any layout can use it.
   *  For creation studios, render the launch-state pill (LAUNCH-001). For
   *  everything else, fall back to the hardcoded mode.badge so Beat the AI
   *  and friends keep their existing LIVE / NEW marker. */
  const isStudio = isStudioMode(mode.key);
  const badgeEl = isStudio ? (
    <span className="absolute right-2 top-2 z-20">
      <StudioLaunchPill studioId={mode.key} size={compact ? 'xs' : 'sm'} showLive />
    </span>
  ) : mode.badge ? (
    <span
      className={`absolute right-2 top-2 z-20 rounded-full ${mode.badgeBg ?? 'bg-brand-primary'} font-bold uppercase tracking-wider text-white shadow-md whitespace-nowrap ${compact ? 'px-1.5 py-0.5 text-[7px]' : 'px-2 py-0.5 text-[9px]'}`}
    >
      {mode.badge}
    </span>
  ) : null;

  /** Common image — object-contain so it sits as a placed element, with
   *  mix-blend-multiply so any near-white background in the PNG visually
   *  merges into the card's gradient (no hard rectangle around the object). */
  const imgEl = mode.image ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={mode.image}
      alt=""
      aria-hidden
      loading="lazy"
      className="h-full w-full object-contain mix-blend-multiply"
    />
  ) : null;

  /** Title + tagline — dark text, sits on the card's gradient (no scrim). */
  // Desktop subtitle = longer description when available; mobile keeps only the label.
  const subtitle = mode.description ?? mode.tagline;

  const titleEl = (
    <>
      <div
        className={`font-display font-bold leading-tight ${mode.textColor} ${
          compact ? 'text-[11px]' : shape === 'tall' ? 'text-lg' : 'text-base'
        }`}
      >
        {compact ? mode.shortLabel : mode.label}
      </div>
      {!compact && (
        <div
          className={`mt-0.5 text-[12px] leading-snug line-clamp-3 ${mode.taglineColor}`}
        >
          {subtitle}
        </div>
      )}
    </>
  );

  // CTA — a discrete white circular badge with an arrow, anchored in the
  // tile's free corner (computed from shape + imagePosition so it never lands
  // on top of the illustration's subject):
  //   • TALL (Book): top-LEFT (image sits top-right; text bottom-left).
  //   • WIDE image-right: bottom-LEFT (image is bottom-right; text doesn't fill the bottom).
  //   • WIDE / SINGLE image-left: bottom-RIGHT.
  //   • SINGLE image-right: bottom-LEFT.
  // Desktop only — small mobile tiles already feel clearly tap-able.
  const isLeftImage = mode.imagePosition === 'left';
  const ctaCornerClass =
    shape === 'tall'
      ? 'top-3 left-3'
      : isLeftImage
        ? 'bottom-3 right-3'
        : 'bottom-3 left-3';
  const ctaEl = !compact ? (
    <span
      aria-hidden
      className={`absolute z-20 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-ai shadow-md ring-1 ring-white/30 transition-all duration-300 ease-out group-hover:scale-[1.18] group-hover:rotate-[10deg] ${ctaCornerClass}`}
    >
      {/* Filled brand-gradient badge with a white arrow inside — the same
          treatment as primary CTAs across the app (sign-in button, selected
          tab pill, etc.). Reads as the strongest call-to-action on each tile
          regardless of the tile's pastel background. */}
      <ArrowUpRight
        className="h-4 w-4 text-white transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        strokeWidth={2.5}
      />
    </span>
  ) : null;

  // ── IMAGE PRESENT → use shape-driven foreground layout ───────────────────
  if (mode.image) {
    // 1. TALL  → object on top, text at bottom (vertical stack)
    //   Image is 75% width, auto height, right-aligned (per visual tuning).
    if (shape === 'tall') {
      return (
        <motion.button {...buttonProps} className={`${baseClasses} flex-col`}>
          {badgeEl}
          {ctaEl}
          <div className={`flex min-h-0 flex-1 justify-end ${compact ? 'p-2' : 'p-3'}`}>
            {mode.image && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={mode.image}
                alt=""
                aria-hidden
                loading="lazy"
                className="h-fit w-3/4 object-contain mix-blend-multiply"
              />
            )}
          </div>
          <div className={`${compact ? 'px-2 pb-2' : 'px-3 pb-3'}`}>{titleEl}</div>
        </motion.button>
      );
    }

    // 2. WIDE  → reference layout: text in a constrained column, image
    //   anchored to the opposite bottom corner with object-contain (no
    //   cropping). Side is driven by mode.imagePosition ('right' default,
    //   'left' for tiles like Comic Studio that mirror the layout).
    //   Mobile keeps the compact flex-row aspect-square / object-contain.
    if (shape === 'wide') {
      if (compact) {
        return (
          <motion.button {...buttonProps} className={`${baseClasses} flex-row items-stretch`}>
            {badgeEl}
            <div className="flex min-w-0 flex-1 flex-col justify-end p-2">{titleEl}</div>
            <div className="relative aspect-square shrink-0 p-1">{imgEl}</div>
          </motion.button>
        );
      }
      const isLeft = mode.imagePosition === 'left';
      return (
        <motion.button {...buttonProps} className={`${baseClasses} flex-col`}>
          {badgeEl}
          {ctaEl}
          <div
            className={`relative z-10 max-w-[48%] shrink-0 p-3 ${isLeft ? 'self-end text-right' : ''}`}
          >
            {titleEl}
          </div>
          {mode.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mode.image}
              alt=""
              aria-hidden
              loading="lazy"
              className={`pointer-events-none absolute mix-blend-multiply ${
                mode.imageFullWidth
                  ? `inset-0 h-full w-full object-contain ${
                      isLeft ? 'object-left-bottom' : 'object-right-bottom'
                    }`
                  : `bottom-0 h-full w-auto max-w-[55%] object-contain ${
                      isLeft ? 'left-0 object-left-bottom' : 'right-0 object-right-bottom'
                    }`
              }`}
            />
          )}
        </motion.button>
      );
    }

    // 3. SINGLE → reference layout: copy occupies a narrower top column on
    //   one side; the illustration anchors to the opposite bottom corner.
    //   Side is driven by mode.imagePosition (defaults to 'right').
    const isLeft = mode.imagePosition === 'left';
    return (
      <motion.button {...buttonProps} className={`${baseClasses} flex-col`}>
        {badgeEl}
        {ctaEl}
        <div
          className={`relative z-10 shrink-0 ${
            compact ? 'p-2' : `max-w-[58%] p-3 ${isLeft ? 'self-end text-right' : ''}`
          }`}
        >
          {titleEl}
        </div>
        {mode.image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={mode.image}
            alt=""
            aria-hidden
            loading="lazy"
            className={`pointer-events-none absolute bottom-0 h-[78%] w-auto max-w-[62%] object-contain mix-blend-multiply ${
              isLeft ? 'left-0 object-left-bottom' : 'right-0 object-right-bottom'
            }`}
          />
        )}
      </motion.button>
    );
  }

  // ── NO IMAGE → icon fallback ─────────────────────────────────────────────
  return (
    <motion.button
      {...buttonProps}
      className={`${baseClasses} flex-col justify-between ${compact ? 'p-2' : 'p-3'}`}
    >
      {ctaEl}
      <div className="relative z-10 flex items-start justify-between">
        <div
          className={`flex items-center justify-center rounded-xl shadow-md ring-1 ${mode.iconRing} ${mode.iconBg} ${compact ? 'h-7 w-7' : 'h-10 w-10'}`}
        >
          <Icon className={`${mode.solidIcon ? 'text-white' : mode.textColor} ${compact ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
        </div>
        {/* Same precedence as the image-present branch: launch-state pill
            for creation studios, legacy mode.badge for everything else. */}
        {isStudio ? (
          <StudioLaunchPill studioId={mode.key} size={compact ? 'xs' : 'sm'} showLive />
        ) : mode.badge ? (
          <span
            className={`rounded-full ${mode.badgeBg ?? 'bg-brand-primary'} font-bold uppercase tracking-wider text-white shadow-sm whitespace-nowrap ${compact ? 'px-1 py-0 text-[7px]' : 'px-1.5 py-0.5 text-[8px]'}`}
          >
            {mode.badge}
          </span>
        ) : null}
      </div>
      <div className="relative z-10 mt-2">{titleEl}</div>
    </motion.button>
  );
}
