'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AiXrayPopup } from '@/components/learning/AiXrayPopup';
import { ShareButton } from '@/components/shared/ShareButton';
import { DownloadButton } from '@/components/shared/DownloadButton';
import type { AiXrayData, GameContent, GameScene } from '@/types';

interface GameData extends GameContent {
  title: string;
}

interface GamePlayerProps {
  game: GameData;
  aiXray: AiXrayData;
  onCreateAnother: () => void;
  creationId?: string;
  readOnly?: boolean;
}

const ENDING_EMOJI: Record<string, string> = {
  success: '🏆',
  neutral: '🌟',
  try_again: '💪',
};

export function GamePlayer({ game, aiXray, onCreateAnother, creationId, readOnly = false }: GamePlayerProps) {
  const [currentSceneId, setCurrentSceneId] = useState(game.startSceneId);
  const [pathHistory, setPathHistory] = useState<string[]>([game.startSceneId]);
  const [showXray, setShowXray] = useState(false);

  const currentScene = game.scenes.find((s) => s.id === currentSceneId);

  // Auto-show X-Ray on first ending (first time per session, skip in readOnly mode)
  useEffect(() => {
    if (!currentScene?.isEnding || readOnly) return;
    const key = 'gsi-xray-shown-game';
    if (!sessionStorage.getItem(key)) {
      setShowXray(true);
      sessionStorage.setItem(key, 'true');
    }
  }, [currentScene?.isEnding, readOnly]);

  const handleChoice = useCallback((nextSceneId: string) => {
    setCurrentSceneId(nextSceneId);
    setPathHistory((prev) => [...prev, nextSceneId]);
  }, []);

  const handleBack = useCallback(() => {
    if (pathHistory.length <= 1) return;
    const newHistory = pathHistory.slice(0, -1);
    setPathHistory(newHistory);
    setCurrentSceneId(newHistory[newHistory.length - 1]!);
  }, [pathHistory]);

  const handleRestart = useCallback(() => {
    setCurrentSceneId(game.startSceneId);
    setPathHistory([game.startSceneId]);
  }, [game.startSceneId]);

  if (!currentScene) return null;

  // Ending screen
  if (currentScene.isEnding) {
    const emoji = ENDING_EMOJI[currentScene.endingType ?? 'neutral'] ?? '🌟';
    const scenesVisited = new Set(pathHistory).size;

    return (
      <div className="flex flex-col items-center gap-5">
        <motion.span
          className="text-7xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          {emoji}
        </motion.span>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-display text-2xl font-bold text-gray-900">
            {currentScene.title}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-gray-600">
            {currentScene.text}
          </p>
          {currentScene.endingMessage && (
            <p className="mt-3 font-display text-sm font-semibold text-emerald-600">
              {currentScene.endingMessage}
            </p>
          )}
        </motion.div>

        {/* Stats */}
        <div className="flex gap-6 text-center text-sm text-gray-500">
          <div>
            <span className="block font-display text-lg font-bold text-gray-900">{scenesVisited}</span>
            scenes visited
          </div>
          <div>
            <span className="block font-display text-lg font-bold text-gray-900">{pathHistory.length - 1}</span>
            choices made
          </div>
          <div>
            <span className="block font-display text-lg font-bold text-gray-900">{game.totalEndings}</span>
            total endings
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex w-full gap-3">
          <ShareButton
            creationId={creationId ?? ''}
            creationTitle={game.title}
            creationType="game"
            className="flex-1"
          />
          <DownloadButton
            creation={{
              id: creationId ?? '',
              type: 'game',
              title: game.title,
              content: game as unknown as GameContent,
            }}
            variant="full"
            className="flex-1"
          />
          {!readOnly && (
            <button
              onClick={() => setShowXray(true)}
              className={cn(
                'flex-1 rounded-full border-2 border-brand-purple py-3 text-center font-bold text-brand-purple',
                'transition-all active:scale-95 hover:bg-brand-purple/5'
              )}
            >
              AI X-Ray 🔍
            </button>
          )}
        </div>

        <button
          onClick={handleRestart}
          className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-center font-bold text-white transition-all hover:shadow-lg active:scale-95"
        >
          Play Again 🔄
        </button>

        {!readOnly && (
          <button
            onClick={onCreateAnother}
            className="w-full rounded-full bg-gray-100 py-3 text-center font-bold text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
          >
            Create Another Adventure
          </button>
        )}

        {!readOnly && (
          <AiXrayPopup isOpen={showXray} onClose={() => setShowXray(false)} aiXray={aiXray} />
        )}
      </div>
    );
  }

  // Active scene
  return (
    <div className="flex flex-col gap-5">
      {/* Path history breadcrumbs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {pathHistory.map((sceneId, i) => {
          const scene = game.scenes.find((s) => s.id === sceneId);
          const isActive = sceneId === currentSceneId;
          return (
            <span
              key={`${sceneId}-${i}`}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium',
                isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
              )}
            >
              {scene?.title ?? sceneId}
            </span>
          );
        })}
      </div>

      {/* Scene content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSceneId}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h3 className="font-display text-lg font-bold text-gray-900">
              {currentScene.title}
            </h3>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              {currentScene.text}
            </p>
          </div>

          {/* Choice buttons */}
          <div className="flex flex-col gap-3">
            {currentScene.choices.map((choice, i) => (
              <motion.button
                key={choice.nextSceneId}
                onClick={() => handleChoice(choice.nextSceneId)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full rounded-2xl border-2 border-emerald-200 bg-white px-5 py-4 text-left font-medium text-gray-700',
                  'transition-all hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98]'
                )}
              >
                {choice.text}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Back button */}
      {pathHistory.length > 1 && (
        <button
          onClick={handleBack}
          className="self-start rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 active:scale-95"
        >
          ← Go Back
        </button>
      )}

      {/* Scene counter */}
      <div className="text-center text-sm text-gray-400">
        Scene {pathHistory.length} of {game.totalScenes}
      </div>
    </div>
  );
}
