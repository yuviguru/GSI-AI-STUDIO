'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { CurriculumTag } from './CurriculumTag';
import type { AiXrayData } from '@gsi/types';

/** Map AI concepts to display-friendly emoji icons */
const CONCEPT_ICONS: Record<string, string> = {
  natural_language_generation: '📝',
  natural_language_processing: '📝',
  nlg: '📝',
  nlp: '📝',
  computer_vision: '👁️',
  image_generation: '🎨',
  neural_networks: '🧠',
  machine_learning: '⚙️',
  generative_ai: '✨',
  prompt_engineering: '💬',
  music_generation: '🎵',
  audio_synthesis: '🎵',
  question_generation: '❓',
  text_classification: '🏷️',
};

function getConceptIcon(concept: string): string {
  const key = concept.toLowerCase().replace(/[\s&]+/g, '_');
  return CONCEPT_ICONS[key] ?? '🤖';
}

interface AiXrayPopupProps {
  isOpen: boolean;
  onClose: () => void;
  aiXray: AiXrayData;
}

export function AiXrayPopup({ isOpen, onClose, aiXray }: AiXrayPopupProps) {
  const { addPoints } = useAiPoints();
  const hasAwarded = useRef(false);

  // Award points on first open (per popup instance)
  useEffect(() => {
    if (isOpen && !hasAwarded.current) {
      hasAwarded.current = true;
      addPoints(aiXray.aiPoints, aiXray.concept);
    }
  }, [isOpen, aiXray.aiPoints, aiXray.concept, addPoints]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed inset-x-4 bottom-nav z-50 mx-auto flex max-h-[calc(90vh-4rem)] max-w-lg flex-col rounded-3xl bg-white shadow-xl md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[90vh] md:-translate-x-1/2 md:-translate-y-1/2"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header (pinned) */}
            <div className="shrink-0 px-6 pt-4">
              {/* Drag handle (mobile) */}
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 md:hidden" />
              <div className="text-center">
                <span className="text-4xl">🔍</span>
                <h3 className="mt-2 font-display text-xl font-bold text-gray-900">
                  AI X-Ray
                </h3>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5">
              {/* Section 1: What did the AI do? */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  What did the AI do?
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl">{getConceptIcon(aiXray.concept)}</span>
                  <span className="font-display text-base font-bold text-gray-900">
                    {aiXray.concept}
                  </span>
                </div>
              </div>

              {/* Section 2: How it works */}
              <div className="mt-3 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  How it works
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {aiXray.explanation}
                </p>
              </div>

              {/* Section 3: CBSE Connection */}
              <div className="mt-3 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  CBSE Connection
                </p>
                <div className="mt-2">
                  <CurriculumTag tag={aiXray.curriculumTag} size="md" />
                </div>
              </div>

              {/* Section 4: AI Points earned */}
              <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-brand-purple/5 p-4">
                <motion.span
                  className="font-display text-2xl font-bold text-brand-purple"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
                >
                  +{aiXray.aiPoints}
                </motion.span>
                <span className="text-sm font-medium text-brand-purple/70">
                  AI Points earned!
                </span>
              </div>
            </div>

            {/* Footer (pinned) */}
            <div className="shrink-0 border-t border-gray-100 px-6 pb-6 pt-4">
              <button
                onClick={onClose}
                className="w-full rounded-full bg-brand-purple py-3.5 text-center font-bold text-white transition-transform active:scale-95"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
