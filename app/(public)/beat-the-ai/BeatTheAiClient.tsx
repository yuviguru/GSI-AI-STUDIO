'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useBeatTheAi } from '@/hooks/useBeatTheAi';
import { useSkills } from '@/hooks/useSkills';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { CategoryPicker } from '@/components/beat-the-ai/CategoryPicker';
import { ChallengeArena } from '@/components/beat-the-ai/ChallengeArena';
import { SideBySideReveal } from '@/components/beat-the-ai/SideBySideReveal';
import { ResultsScreen } from '@/components/beat-the-ai/ResultsScreen';
import { StatsBoard } from '@/components/beat-the-ai/StatsBoard';
import { Mascot } from '@/components/mascot/Mascot';
import { useState, useEffect } from 'react';

const transition = { duration: 0.2, ease: 'easeOut' };
const variants = {
  enter: { opacity: 0, y: -12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
};

export function BeatTheAiClient() {
  const game = useBeatTheAi();
  const skillsData = useSkills();
  const { reloadFromServer: reloadPoints } = useAiPoints();
  const [showStats, setShowStats] = useState(false);

  // Sync AI points header when results arrive (server already persisted)
  useEffect(() => {
    if (game.phase === 'results') {
      reloadPoints();
    }
  }, [game.phase, reloadPoints]);

  if (showStats) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <button
          onClick={() => setShowStats(false)}
          className="mb-4 text-sm text-purple-600 hover:underline"
        >
          &larr; Back to Challenge
        </button>
        <StatsBoard
          skills={skillsData.skills}
          onChallenge={() => {
            setShowStats(false);
            game.playAgain();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Beat the AI
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Can your creativity beat artificial intelligence?
        </p>
      </div>

      {game.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {game.error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {game.phase === 'picking' && (
          <motion.div
            key="picking"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <CategoryPicker
              onSelect={game.startRound}
              isLoading={false}
              onViewStats={() => setShowStats(true)}
            />
          </motion.div>
        )}

        {game.phase === 'loading' && (
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
              Preparing your challenge...
            </p>
          </motion.div>
        )}

        {game.phase === 'challenging' && game.prompt && (
          <motion.div
            key="challenging"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <ChallengeArena
              prompt={game.prompt}
              aiDifficulty={game.aiDifficulty!}
              onSubmit={game.submitResponse}
            />
          </motion.div>
        )}

        {game.phase === 'submitting' && (
          <motion.div
            key="submitting"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="flex flex-col items-center gap-4 py-12"
          >
            <Mascot expression="thinking" size="md" />
            <p className="text-sm text-gray-500 animate-pulse">
              AI is writing its version...
            </p>
          </motion.div>
        )}

        {(game.phase === 'revealing' || game.phase === 'judging') &&
          game.aiResponse && (
            <motion.div
              key="revealing"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
            >
              <SideBySideReveal
                kidResponse={game.kidResponse}
                aiResponse={game.aiResponse}
                onJudge={game.requestJudge}
                isLoading={game.isLoading}
              />
            </motion.div>
          )}

        {game.phase === 'results' && game.result && (
          <motion.div
            key="results"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <ResultsScreen
              result={game.result}
              prompt={game.prompt!}
              aiXray={game.aiXray}
              onPlayAgain={() => {
                skillsData.refreshSkills();
                reloadPoints();
                game.playAgain();
              }}
              onViewStats={() => {
                skillsData.refreshSkills();
                reloadPoints();
                setShowStats(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
