'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { useModal } from '@/contexts/ModalContext';

export function AiPointsBadge() {
  const { totalPoints, pendingPoints } = useAiPoints();
  const { openModal } = useModal();
  const [displayPoints, setDisplayPoints] = useState(0);
  const animRef = useRef<number>(0);

  // Counting animation when totalPoints changes
  useEffect(() => {
    const start = displayPoints;
    const end = totalPoints;
    if (start === end) return;

    const duration = 800; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPoints(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPoints]);

  return (
    <button
      onClick={() => openModal('badgeGallery')}
      className="relative flex items-center gap-1.5 rounded-full bg-brand-purple/10 px-3 py-1.5 text-sm font-medium text-brand-purple transition-transform active:scale-95"
      aria-label="Open badge gallery"
    >
      <Sparkles className="h-4 w-4" />
      <span>{displayPoints} AI Points</span>

      {/* Floating +N animation */}
      <AnimatePresence>
        {pendingPoints > 0 && (
          <motion.span
            className="absolute -top-3 right-0 rounded-full bg-brand-purple px-2 py-0.5 text-xs font-bold text-white"
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{ y: -8, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            +{pendingPoints}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
