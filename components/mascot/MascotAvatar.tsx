'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getMascot, type MascotId } from '@/lib/mascots/roster';

type MascotAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_MAP: Record<MascotAvatarSize, { wrap: string; emoji: string }> = {
  xs: { wrap: 'h-7 w-7', emoji: 'text-base' },
  sm: { wrap: 'h-10 w-10', emoji: 'text-xl' },
  md: { wrap: 'h-14 w-14', emoji: 'text-3xl' },
  lg: { wrap: 'h-20 w-20', emoji: 'text-4xl' },
  xl: { wrap: 'h-28 w-28', emoji: 'text-5xl' },
  '2xl': { wrap: 'h-40 w-40', emoji: 'text-7xl' },
};

interface MascotAvatarProps {
  id: string | MascotId | undefined | null;
  size?: MascotAvatarSize;
  /** Adds a subtle floating idle animation. */
  animate?: boolean;
  /** Renders inside a soft circular tile with the mascot's signature gradient. */
  tile?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * MascotAvatar — renders a kid's chosen AI buddy from the diverse mascot roster
 * (Koko, Pixie, Aria, Bolt, Luma, Pebble, Rio, Nova).
 *
 * Distinct from the legacy Mascot component, which renders Koko-the-cat with
 * different expressions. This one is keyed by mascot id and used for profile,
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

  const inner = (
    <span
      role="img"
      aria-label={ariaLabel ?? mascot.name}
      className={cn(
        'flex items-center justify-center leading-none',
        sizeClasses.emoji,
      )}
    >
      {mascot.art}
    </span>
  );

  const wrapped = tile ? (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br shadow-inner ring-2 ring-white',
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

  if (!animate) {
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
