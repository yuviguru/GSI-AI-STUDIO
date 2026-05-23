'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getMascot, type MascotId } from '@/lib/mascots/roster';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

type MascotAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_MAP: Record<MascotAvatarSize, { wrap: string; emoji: string }> = {
  xs: { wrap: 'h-7 w-7', emoji: 'text-base' },
  sm: { wrap: 'h-10 w-10', emoji: 'text-xl' },
  md: { wrap: 'h-14 w-14', emoji: 'text-3xl' },
  lg: { wrap: 'h-20 w-20', emoji: 'text-4xl' },
  xl: { wrap: 'h-28 w-28', emoji: 'text-5xl' },
  '2xl': { wrap: 'h-40 w-40', emoji: 'text-7xl' },
};

/**
 * Two-tier cache so we only fetch each Lottie JSON ONCE per page load,
 * even when multiple MascotAvatars mount simultaneously (the common case —
 * hub, HUD, profile scene, picker, loader all render together).
 *
 *   - `lottieCache`     — resolved data. Subsequent renders skip the
 *                         network entirely.
 *   - `lottieInFlight`  — promises for currently-fetching URLs. Concurrent
 *                         callers await the existing promise instead of
 *                         firing a duplicate fetch. Evicted on settle.
 *
 * Without the in-flight tier, six concurrent <MascotAvatar id="pixie"/>
 * mounts would each see an empty resolved cache and fire six identical
 * GETs (each returning 304 from HTTP cache but still adding network noise
 * + main-thread JSON.parse work).
 */
const lottieCache = new Map<string, unknown>();
const lottieInFlight = new Map<string, Promise<unknown>>();

function loadLottie(url: string): Promise<unknown> {
  const cached = lottieCache.get(url);
  if (cached !== undefined) return Promise.resolve(cached);
  const pending = lottieInFlight.get(url);
  if (pending) return pending;
  const promise = fetch(url)
    .then((r) => r.json())
    .then((data: unknown) => {
      lottieCache.set(url, data);
      return data;
    })
    .finally(() => {
      lottieInFlight.delete(url);
    });
  lottieInFlight.set(url, promise);
  return promise;
}

interface MascotAvatarProps {
  id: string | MascotId | undefined | null;
  size?: MascotAvatarSize;
  /** Adds a subtle floating idle animation (only used for emoji fallback —
   *  Lottie animations carry their own motion). */
  animate?: boolean;
  /** Renders inside a soft circular tile with the mascot's signature gradient. */
  tile?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * MascotAvatar — renders a kid's chosen AI buddy from the diverse mascot roster.
 *
 * Rendering precedence:
 *   1. Lottie animation if the mascot defines `lottie` in the roster
 *   2. Emoji placeholder otherwise (always shown during initial load too)
 *
 * Distinct from the legacy Mascot component (which renders Koko-the-cat with
 * different expressions). This one is keyed by mascot id and used for profile,
 * onboarding, and dashboard greetings.
 */
export function MascotAvatar({
  id,
  size = 'md',
  animate = false,
  tile = false,
  className,
  ariaLabel,
}: MascotAvatarProps) {
  const mascot = getMascot(id);
  const sizeClasses = SIZE_MAP[size];

  // Lazy-load the Lottie JSON when the mascot has one. Show the emoji as a
  // placeholder until the JSON is fetched + parsed (it's ~250KB but cached
  // after first load).
  const [lottieData, setLottieData] = useState<unknown>(() =>
    mascot.lottie ? lottieCache.get(mascot.lottie) ?? null : null,
  );

  useEffect(() => {
    if (!mascot.lottie) {
      setLottieData(null);
      return;
    }
    const url = mascot.lottie;
    // Fast-path: synchronous hit on the resolved cache. Avoids a render
    // flash for the common "same mascot mounts multiple times" case.
    const cached = lottieCache.get(url);
    if (cached !== undefined) {
      setLottieData(cached);
      return;
    }
    let cancelled = false;
    loadLottie(url)
      .then((data) => {
        if (cancelled) return;
        setLottieData(data);
      })
      .catch(() => {
        // silently fall back to emoji
      });
    return () => {
      cancelled = true;
    };
  }, [mascot.lottie]);

  const accessibleLabel = ariaLabel ?? mascot.name;

  const lottieInner =
    mascot.lottie && lottieData ? (
      <div
        role="img"
        aria-label={accessibleLabel}
        className="flex h-full w-full items-center justify-center"
      >
        <Lottie animationData={lottieData} loop autoplay aria-hidden />
      </div>
    ) : null;

  const emojiInner = (
    <span
      role="img"
      aria-label={accessibleLabel}
      className={cn(
        'flex items-center justify-center leading-none',
        sizeClasses.emoji,
      )}
    >
      {mascot.art}
    </span>
  );

  const inner = lottieInner ?? emojiInner;

  const wrapped = tile ? (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br shadow-inner ring-2 ring-white',
        mascot.gradient,
        sizeClasses.wrap,
      )}
    >
      {inner}
    </div>
  ) : (
    <div className={cn('flex items-center justify-center', sizeClasses.wrap)}>
      {inner}
    </div>
  );

  // Skip the float-bob if a Lottie is rendering — the animation already has
  // its own motion and stacking another transform makes it feel jittery.
  const shouldFloat = animate && !lottieInner;

  if (!shouldFloat) {
    return <div className={className}>{wrapped}</div>;
  }

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {wrapped}
    </motion.div>
  );
}
