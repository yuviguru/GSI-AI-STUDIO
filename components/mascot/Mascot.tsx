'use client';

import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';

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

// Module-level cache so switching expressions doesn't re-fetch
const lottieCache = new Map<string, object>();

function useLottieData(expression: MascotExpression) {
  const [data, setData] = useState<object | null>(
    () => lottieCache.get(expression) ?? null,
  );

  useEffect(() => {
    const cached = lottieCache.get(expression);
    if (cached) {
      setData(cached);
      return;
    }

    let cancelled = false;
    fetch(`/lottie/koko-${expression}.json`)
      .then((r) => r.json())
      .then((json) => {
        lottieCache.set(expression, json);
        if (!cancelled) setData(json);
      })
      .catch(() => {
        // Silently fail — mascot is decorative
      });

    return () => {
      cancelled = true;
    };
  }, [expression]);

  return data;
}

export const Mascot = memo(function Mascot({
  expression = 'happy',
  size = 'md',
  className = '',
  bobbing = true,
}: MascotProps) {
  const animationData = useLottieData(expression);
  const px = SIZE_MAP[size];

  const lottieEl = animationData ? (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      style={{ width: px, height: px }}
    />
  ) : (
    // Placeholder while loading
    <div
      style={{ width: px, height: px }}
      className="animate-pulse rounded-full bg-brand-purple/20"
    />
  );

  if (!bobbing) {
    return <div className={className}>{lottieEl}</div>;
  }

  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
    >
      {lottieEl}
    </motion.div>
  );
});
