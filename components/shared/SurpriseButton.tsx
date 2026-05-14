'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getRandomTemplate, type Template } from '@/lib/templates';
import type { CreationType } from '@gsi/types';

interface SurpriseButtonProps {
  type: CreationType;
  accentColor: 'brand-purple' | 'brand-orange' | 'brand-cyan' | 'emerald';
  onSelect: (template: Template) => void;
  className?: string;
}

export function SurpriseButton({ type, accentColor, onSelect, className }: SurpriseButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    // Animate for 600ms, then apply the template
    setTimeout(() => {
      const template = getRandomTemplate(type);
      if (template) onSelect(template);
      setIsAnimating(false);
    }, 600);
  }, [isAnimating, type, onSelect]);

  const colorMap = {
    'brand-purple': 'border-brand-purple/30 text-brand-purple hover:bg-brand-purple/5',
    'brand-orange': 'border-brand-orange/30 text-brand-orange hover:bg-brand-orange/5',
    'brand-cyan': 'border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/5',
    'emerald': 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-50',
  };

  return (
    <motion.button
      onClick={handleClick}
      animate={
        isAnimating
          ? {
              rotate: [0, -10, 10, -10, 10, 0],
              scale: [1, 1.1, 1.1, 1.1, 1.1, 1],
            }
          : {}
      }
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all active:scale-95',
        colorMap[accentColor],
        className
      )}
      aria-label="Surprise Me — pick a random template"
    >
      <span className="text-base">🎲</span>
      Surprise Me!
    </motion.button>
  );
}
