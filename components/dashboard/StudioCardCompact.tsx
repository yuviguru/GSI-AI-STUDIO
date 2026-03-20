'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StudioCardCompactProps {
  href: string;
  emoji: string;
  title: string;
  description: string;
  gradient: string;
  bg: string;
  hoverShadow: string;
}

export function StudioCardCompact({
  href,
  emoji,
  title,
  description,
  gradient,
  bg,
  hoverShadow,
}: StudioCardCompactProps) {
  return (
    <Link href={href} className="group block">
      <motion.div
        className={cn(
          'relative rounded-xl border border-gray-100 bg-white p-4 text-center shadow-card',
          hoverShadow,
        )}
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div
          className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-2xl',
            bg,
          )}
        >
          {emoji}
        </div>
        <h3 className="mt-2 font-display text-sm font-bold text-gray-900">{title}</h3>
        <p className="mt-0.5 text-xs leading-snug text-gray-400">{description}</p>
        <div
          className={cn(
            'mt-3 rounded-full bg-gradient-to-r py-1 text-xs font-semibold text-white',
            gradient,
          )}
        >
          Create →
        </div>
      </motion.div>
    </Link>
  );
}
