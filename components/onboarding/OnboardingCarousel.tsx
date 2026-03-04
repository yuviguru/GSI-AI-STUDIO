'use client';

import type { ReactNode } from 'react';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { OnboardingSlide } from './OnboardingSlide';
import {
  MeetKokoIllustration,
  CreateThingsIllustration,
  LetsGoIllustration,
} from './OnboardingIllustrations';

const STORAGE_KEY = 'gsi-onboarding-complete';

interface SlideData {
  title: string;
  subtitle: string;
  gradient: string;
  illustration: ReactNode;
}

const slides: SlideData[] = [
  {
    title: 'Meet Koko!',
    subtitle: 'Your AI creative buddy who helps you imagine anything!',
    gradient: 'bg-gradient-to-b from-violet-50 to-white',
    illustration: <MeetKokoIllustration />,
  },
  {
    title: 'Create Amazing Things',
    subtitle: 'Stories, music, quizzes — all powered by AI!',
    gradient: 'bg-gradient-to-b from-orange-50 to-white',
    illustration: <CreateThingsIllustration />,
  },
  {
    title: "Let's Go!",
    subtitle: 'Your first creation is just a tap away!',
    gradient: 'bg-gradient-to-b from-cyan-50 to-white',
    illustration: <LetsGoIllustration />,
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

interface OnboardingCarouselProps {
  onComplete: () => void;
}

export function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const isLastSlide = current === slides.length - 1;

  const markComplete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable — proceed anyway
    }
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      markComplete();
      router.push('/create/story');
    } else {
      setDirection(1);
      setCurrent((c) => c + 1);
    }
  }, [isLastSlide, markComplete, router]);

  const handleSkip = useCallback(() => {
    markComplete();
  }, [markComplete]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const swipeThreshold = 50;
      const velocityThreshold = 300;

      if (
        info.offset.x < -swipeThreshold ||
        info.velocity.x < -velocityThreshold
      ) {
        // Swiped left → next
        if (current < slides.length - 1) {
          setDirection(1);
          setCurrent((c) => c + 1);
        }
      } else if (
        info.offset.x > swipeThreshold ||
        info.velocity.x > velocityThreshold
      ) {
        // Swiped right → prev
        if (current > 0) {
          setDirection(-1);
          setCurrent((c) => c - 1);
        }
      }
    },
    [current],
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      {/* Skip button */}
      <div className="absolute right-4 top-4 z-10">
        <button
          type="button"
          onClick={handleSkip}
          className="rounded-full px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
        >
          Skip
        </button>
      </div>

      {/* Slides */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence custom={direction} mode="popLayout">
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
          >
            {(() => {
              const slide = slides[current] as SlideData;
              return (
                <OnboardingSlide
                  illustration={slide.illustration}
                  title={slide.title}
                  subtitle={slide.subtitle}
                  gradient={slide.gradient}
                />
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col items-center gap-5 pb-10 pt-2">
        {/* Dot indicators */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                'h-2 rounded-full transition-colors',
                i === current ? 'bg-brand-purple' : 'bg-gray-200',
              )}
              animate={{ width: i === current ? 24 : 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          ))}
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={handleNext}
          className={cn(
            'h-12 rounded-full px-8 text-base font-semibold text-white',
            'shadow-lg transition-transform hover:scale-105 active:scale-95',
            isLastSlide
              ? 'bg-gradient-to-r from-brand-purple to-brand-orange shadow-brand-purple/25'
              : 'bg-brand-purple shadow-brand-purple/25',
          )}
        >
          {isLastSlide ? 'Start Creating! ✨' : 'Next'}
        </button>
      </div>
    </motion.div>
  );
}

export { STORAGE_KEY as ONBOARDING_STORAGE_KEY };
