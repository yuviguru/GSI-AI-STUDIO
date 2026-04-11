'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

export type MascotExpression =
  | 'happy'
  | 'thinking'
  | 'celebrating'
  | 'waving'
  | 'surprised'
  | 'painting'
  | 'singing';

interface MascotProps {
  expression?: MascotExpression;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  bobbing?: boolean;
}

const SIZE_MAP = { sm: 64, md: 120, lg: 200 } as const;

// Koko the cat — emoji-based stand-in until the real mascot art ships.
const EMOJI_MAP: Record<MascotExpression, string> = {
  happy: '😺',
  thinking: '🙀',
  celebrating: '😸',
  waving: '😺',
  surprised: '🙀',
  painting: '😼',
  singing: '😻',
};

export const Mascot = memo(function Mascot({
  expression = 'happy',
  size = 'md',
  className = '',
  bobbing = true,
}: MascotProps) {
  const px = SIZE_MAP[size];
  const emoji = EMOJI_MAP[expression];

  const face = (
    <div
      style={{
        width: px,
        height: px,
        fontSize: Math.round(px * 0.85),
        lineHeight: 1,
      }}
      className="flex items-center justify-center drop-shadow-sm"
      role="img"
      aria-label={`Koko is ${expression}`}
    >
      {emoji}
    </div>
  );

  if (!bobbing) {
    return <div className={className}>{face}</div>;
  }

  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
    >
      {face}
    </motion.div>
  );
});
