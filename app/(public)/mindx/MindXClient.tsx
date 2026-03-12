'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useSkillArena } from '@/hooks/useSkillArena';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { ModulePicker } from '@/components/mindx/ModulePicker';
import { AssessmentArena } from '@/components/mindx/AssessmentArena';
import { MentorFeedback } from '@/components/mindx/MentorFeedback';
import { ProgressDashboard } from '@/components/mindx/ProgressDashboard';
import { Mascot } from '@/components/mascot/Mascot';
import { useState, useEffect } from 'react';

const transition = { duration: 0.2, ease: 'easeOut' };
const variants = {
  enter: { opacity: 0, y: -12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
};

export function MindXClient() {
  const arena = useSkillArena();
  const { phase, finishAssessment } = arena;
  const { reloadFromServer: reloadPoints } = useAiPoints();
  const [showProgress, setShowProgress] = useState(false);

  // Sync AI points when results arrive
  useEffect(() => {
    if (phase === 'results') {
      reloadPoints();
    }
  }, [phase, reloadPoints]);

  // Auto-submit when all challenges are answered (phase transitions to 'submitting')
  useEffect(() => {
    if (phase === 'submitting') {
      finishAssessment();
    }
  }, [phase, finishAssessment]);

  if (showProgress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ProgressDashboard onBack={() => setShowProgress(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          MindX
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Test your skills. Get smarter with AI mentoring.
        </p>
        {arena.phase === 'picking' && (
          <button
            onClick={() => setShowProgress(true)}
            className="mt-2 text-xs font-medium text-brand-purple hover:underline"
          >
            View Progress
          </button>
        )}
      </div>

      {arena.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {arena.error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {arena.phase === 'picking' && (
          <motion.div
            key="picking"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <ModulePicker onSelect={arena.startAssessment} />
          </motion.div>
        )}

        {arena.phase === 'loading' && (
          <motion.div
            key="loading"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="flex flex-col items-center gap-4 py-12"
          >
            <Mascot expression="thinking" size="md" />
            <p className="text-sm text-gray-500 animate-pulse">
              Preparing your assessment...
            </p>
          </motion.div>
        )}

        {arena.phase === 'challenging' && arena.currentChallenge && arena.module && (
          <motion.div
            key="challenging"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <AssessmentArena
              challenge={arena.currentChallenge}
              challengeIndex={arena.currentIndex}
              totalChallenges={arena.challenges.length}
              module={arena.module}
              onAnswer={arena.submitAnswer}
            />
          </motion.div>
        )}

        {(arena.phase === 'submitting' || arena.phase === 'evaluating') && (
          <motion.div
            key="evaluating"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="flex flex-col items-center gap-4 py-12"
          >
            <Mascot expression="thinking" size="md" />
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium text-gray-700 animate-pulse">
                Koko is evaluating your answers...
              </p>
              <p className="text-xs text-gray-400">
                This may take a moment
              </p>
            </div>
          </motion.div>
        )}

        {arena.phase === 'results' && arena.result && (
          <motion.div
            key="results"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <MentorFeedback
              result={arena.result}
              onTryAgain={() => {
                reloadPoints();
                arena.tryAgain();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
