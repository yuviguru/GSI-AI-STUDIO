'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

export type ConfettiVariant = 'burst' | 'rain' | 'sides';

interface ConfettiCelebrationProps {
  trigger: boolean;
  variant?: ConfettiVariant;
  onComplete?: () => void;
}

const BRAND_COLORS = ['#7C3AED', '#F97316', '#06B6D4', '#FBBF24', '#34D399'];

export function ConfettiCelebration({
  trigger,
  variant = 'burst',
  onComplete,
}: ConfettiCelebrationProps) {
  const prevTrigger = useRef(false);

  useEffect(() => {
    // Only fire on false → true transition
    if (!trigger || prevTrigger.current) {
      prevTrigger.current = trigger;
      return;
    }
    prevTrigger.current = true;

    const common = { colors: BRAND_COLORS, disableForReducedMotion: true };

    if (variant === 'burst') {
      confetti({
        ...common,
        particleCount: 100,
        spread: 70,
        origin: { y: 0.7 },
      });
      setTimeout(() => onComplete?.(), 2000);
    } else if (variant === 'rain') {
      const interval = setInterval(() => {
        confetti({
          ...common,
          particleCount: 5,
          angle: 90,
          spread: 50,
          origin: { y: 0 },
        });
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        onComplete?.();
      }, 2000);
    } else if (variant === 'sides') {
      confetti({
        ...common,
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
      });
      confetti({
        ...common,
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
      });
      setTimeout(() => onComplete?.(), 2500);
    }
  }, [trigger, variant, onComplete]);

  // Reset ref when trigger goes false so it can fire again
  useEffect(() => {
    if (!trigger) prevTrigger.current = false;
  }, [trigger]);

  return null; // canvas-confetti creates its own canvas overlay
}
