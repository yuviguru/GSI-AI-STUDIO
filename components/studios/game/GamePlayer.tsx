'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AiXrayPopup } from '@/components/learning/AiXrayPopup';
import { ShareButton } from '@/components/shared/ShareButton';
import type { GameContent, GameScene, AiXrayData } from '@/types';

interface GamePlayerProps {
  game: GameContent & { title: string };
  aiXray: AiXrayData;
  onCreateAnother: () => void;
  creationId?: string;
  readOnly?: boolean;
}

const ENDING_EMOJI: Record<string, string> = {
  success: '🏆',
  neutral: '⭐',
  try_again: '💪',
};

export function GamePlayer({ game, aiXray, onCreateAnother, creationId, readOnly }: GamePlayerProps) {
  const [currentSceneId, setCurrentSceneId] = useState(game.startSceneId);
  const [pathHistory, setPathHistory] = useState<string[]>([game.startSceneId]);
  const [showXray, setShowXray] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const sceneMap = new Map(game.scenes.map((s) => [s.id, s]));
  const currentScene = sceneMap.get(currentSceneId);

  const handleChoice = useCallback((nextSceneId: string) => {
    setPathHistory((prev) => [...prev, nextSceneId]);
    setCurrentSceneId(nextSceneId);
  }, []);

  const handleBack = useCallback(() => {
    if (pathHistory.length <= 1) return;
    const newHistory = pathHistory.slice(0, -1);
    setPathHistory(newHistory);
    setCurrentSceneId(newHistory[newHistory.length - 1]!);
  }, [pathHistory]);

  const handleRestart = useCallback(() => {
    setPathHistory([game.startSceneId]);
    setCurrentSceneId(game.startSceneId);
    setShowHistory(false);
  }, [game.startSceneId]);

  if (!currentScene) return null;

  const choicesMade = pathHistory.length - 1;
  const scenesVisited = new Set(pathHistory).size;

  return (
    <div className="flex flex-col gap-4">
      {/* Title bar */}
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-gray-900">{game.title}</h2>
        <p className="mt-1 text-sm text-gray-400">
          Scene {pathHistory.length} of ~{game.totalScenes}
        </p>
      </div>

      {/* Scene card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSceneId}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <h3 className="font-display text-lg font-bold text-emerald-700">{currentScene.title}</h3>
          <p className="mt-3 leading-relaxed text-gray-700">{currentScene.text}</p>

          {/* Choice buttons or ending */}
          {currentScene.isEnding ? (
            <EndingScreen
              scene={currentScene}
              scenesVisited={scenesVisited}
              choicesMade={choicesMade}
              onRestart={handleRestart}
              onCreateAnother={onCreateAnother}
              onShowXray={() => setShowXray(true)}
              creationId={creationId}
              gameTitle={game.title}
              readOnly={readOnly}
            />
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              {currentScene.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => handleChoice(choice.nextSceneId)}
                  className={cn(
                    'w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3.5 text-left text-sm font-medium text-emerald-800 transition-all',
                    'hover:border-emerald-400 hover:bg-emerald-100 active:scale-[0.98]'
                  )}
                >
                  {choice.text}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Back + History controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={pathHistory.length <= 1}
          className={cn(
            'rounded-full border border-gray-200 px-4 py-2 text-sm font-medium transition-all active:scale-95',
            pathHistory.length <= 1
              ? 'cursor-not-allowed text-gray-300'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          ← Go Back
        </button>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
        >
          {showHistory ? 'Hide' : 'Show'} Path
        </button>
      </div>

      {/* Path history */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Your Path</h4>
              <div className="flex flex-col gap-1.5">
                {pathHistory.map((sceneId, i) => {
                  const scene = sceneMap.get(sceneId);
                  if (!scene) return null;
                  const isCurrent = i === pathHistory.length - 1;
                  return (
                    <div
                      key={`${sceneId}-${i}`}
                      className={cn(
                        'flex items-center gap-2 text-sm',
                        isCurrent ? 'font-semibold text-emerald-700' : 'text-gray-500'
                      )}
                    >
                      <span className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs',
                        isCurrent ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                      )}>
                        {i + 1}
                      </span>
                      {scene.title}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI X-Ray popup */}
      {showXray && (
        <AiXrayPopup isOpen={showXray} aiXray={aiXray} onClose={() => setShowXray(false)} />
      )}
    </div>
  );
}

/** Ending screen shown when player reaches an ending scene */
function EndingScreen({
  scene,
  scenesVisited,
  choicesMade,
  onRestart,
  onCreateAnother,
  onShowXray,
  creationId,
  gameTitle,
  readOnly,
}: {
  scene: GameScene;
  scenesVisited: number;
  choicesMade: number;
  onRestart: () => void;
  onCreateAnother: () => void;
  onShowXray: () => void;
  creationId?: string;
  gameTitle: string;
  readOnly?: boolean;
}) {
  const emoji = ENDING_EMOJI[scene.endingType ?? 'neutral'] ?? '⭐';

  return (
    <div className="mt-6 flex flex-col items-center gap-4 rounded-xl bg-gradient-to-b from-emerald-50 to-teal-50 p-6 text-center">
      <span className="text-5xl">{emoji}</span>
      {scene.endingMessage && (
        <p className="font-display text-lg font-bold text-emerald-800">{scene.endingMessage}</p>
      )}
      <div className="flex gap-4 text-sm text-gray-500">
        <span>{scenesVisited} scenes visited</span>
        <span>{choicesMade} choices made</span>
      </div>
      <div className="mt-2 flex w-full flex-col gap-2">
        <button
          onClick={onRestart}
          className="w-full rounded-full bg-emerald-500 py-3 font-display font-bold text-white transition-all hover:bg-emerald-600 active:scale-[0.98]"
        >
          Play Again
        </button>
        <div className="flex gap-2">
          {creationId && <ShareButton creationId={creationId} creationTitle={gameTitle} creationType="game" className="flex-1" />}
          <button
            onClick={onShowXray}
            className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
          >
            AI X-Ray
          </button>
        </div>
        {!readOnly && (
          <button
            onClick={onCreateAnother}
            className="mt-1 text-sm font-medium text-emerald-600 hover:underline"
          >
            Create Another Game
          </button>
        )}
      </div>
    </div>
  );
}
