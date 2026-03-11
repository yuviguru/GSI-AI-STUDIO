'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSkillArena } from '@/hooks/useSkillArena';
import { useSkillArenaProgress } from '@/hooks/useSkillArenaProgress';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { ModulePicker } from '@/components/skill-arena/ModulePicker';
import { AssessmentArena } from '@/components/skill-arena/AssessmentArena';
import { MentorResults } from '@/components/skill-arena/MentorResults';
import { ProgressDashboard } from '@/components/skill-arena/ProgressDashboard';
import { Mascot } from '@/components/mascot/Mascot';

const transition = { duration: 0.2, ease: 'easeOut' };
const variants = {
  enter: { opacity: 0, y: -12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
};

export function SkillArenaClient() {
  const arena = useSkillArena();
  const progressData = useSkillArenaProgress();
  const { reloadFromServer: reloadPoints } = useAiPoints();
  const [showProgress, setShowProgress] = useState(false);

  // Sync AI points header when results arrive
  useEffect(() => {
    if (arena.phase === 'results') {
      reloadPoints();
    }
  }, [arena.phase, reloadPoints]);

  if (showProgress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ProgressDashboard
          progress={progressData.progress}
          isLoading={progressData.isLoading}
          onBack={() => setShowProgress(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          MindX Skill Arena
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Test your skills and get personalized AI feedback
        </p>
      </div>

      {arena.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {arena.error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {arena.phase === 'modulePicking' && (
          <motion.div
            key="modulePicking"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <ModulePicker
              onSelect={arena.startAssessment}
              isLoading={false}
              moduleProgress={progressData.progress.modules}
              onViewProgress={() => {
                progressData.refreshProgress();
                setShowProgress(true);
              }}
            />
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

        {arena.phase === 'assessing' && arena.module && arena.difficulty && (
          <motion.div
            key="assessing"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <AssessmentArena
              module={arena.module}
              difficulty={arena.difficulty}
              challenges={arena.challenges}
              currentIndex={arena.currentChallengeIndex}
              onSubmitAnswer={arena.submitAnswer}
              onFinish={arena.submitAllAnswers}
              hasAnsweredCurrent={arena.hasAnsweredCurrent}
              isLastChallenge={arena.isLastChallenge}
            />
          </motion.div>
        )}

        {arena.phase === 'evaluating' && (
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
            <p className="text-sm text-gray-500 animate-pulse">
              Koko is reviewing your work...
            </p>
          </motion.div>
        )}

        {arena.phase === 'results' && arena.band !== null && arena.bandTitle && arena.mentorFeedback && arena.aiXray && arena.module && (
          <motion.div
            key="results"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <MentorResults
              module={arena.module}
              score={arena.score!}
              band={arena.band}
              bandTitle={arena.bandTitle}
              challengeResults={arena.challengeResults}
              mentorFeedback={arena.mentorFeedback}
              aiXray={arena.aiXray}
              aiPointsEarned={arena.aiPointsEarned}
              previousBand={arena.previousBand}
              improved={arena.improved}
              onTryAgain={() => {
                progressData.refreshProgress();
                reloadPoints();
                arena.tryAgain();
              }}
              onViewProgress={() => {
                progressData.refreshProgress();
                reloadPoints();
                setShowProgress(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
