'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type {
  BeatTheAiPrompt,
  BeatTheAiSubmitResponse,
  BeatTheAiXray,
  BeatTheAiSkillId,
} from '@/types/beatTheAi.types';
import { SKILL_INFO } from '@/types/beatTheAi.types';
import { Mascot } from '@/components/mascot/Mascot';
import { ConfettiCelebration } from '@/components/celebrations/ConfettiCelebration';

interface ResultsScreenProps {
  result: BeatTheAiSubmitResponse;
  prompt: BeatTheAiPrompt;
  aiXray: BeatTheAiXray | null;
  onPlayAgain: () => void;
  onViewStats: () => void;
}

const RESULT_CONFIG = {
  kid_wins: {
    title: 'You Beat the AI!',
    subtitle: 'Your creativity shines brighter!',
    mascotExpression: 'celebrating' as const,
    bgGradient: 'from-purple-100 to-pink-100',
    confetti: true,
  },
  ai_wins: {
    title: 'AI Wins This Round',
    subtitle: 'But you\'re getting better! Try again?',
    mascotExpression: 'thinking' as const,
    bgGradient: 'from-cyan-100 to-blue-100',
    confetti: false,
  },
  tie: {
    title: 'It\'s a Tie!',
    subtitle: 'Great minds think alike!',
    mascotExpression: 'waving' as const,
    bgGradient: 'from-amber-100 to-yellow-100',
    confetti: false,
  },
};

export function ResultsScreen({ result, prompt, aiXray, onPlayAgain, onViewStats }: ResultsScreenProps) {
  const config = RESULT_CONFIG[result.result];
  const xray = aiXray ?? result.aiXray;

  useEffect(() => {
    // Trigger confetti on kid win
    if (config.confetti) {
      // Small delay for animation timing
    }
  }, [config.confetti]);

  return (
    <div className="space-y-5">
      <ConfettiCelebration trigger={config.confetti} variant="burst" />

      {/* Winner announcement */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br ${config.bgGradient} p-6 text-center`}
      >
        <Mascot expression={config.mascotExpression} size="md" />
        <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
        <p className="text-sm text-gray-600">{config.subtitle}</p>
      </motion.div>

      {/* Score comparison */}
      <div className="flex items-center justify-center gap-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="text-center">
          <p className="text-xs text-gray-500">Your Score</p>
          <p className="text-2xl font-bold text-purple-600">{result.kidAvgScore.toFixed(1)}</p>
        </div>
        <div className="text-lg font-bold text-gray-300">vs</div>
        <div className="text-center">
          <p className="text-xs text-gray-500">AI Score</p>
          <p className="text-2xl font-bold text-cyan-600">{result.aiAvgScore.toFixed(1)}</p>
        </div>
      </div>

      {/* Skill XP earned */}
      {Object.keys(result.skillXpEarned).length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-700">Skills Earned</h3>
          <div className="space-y-2">
            {(Object.entries(result.skillXpEarned) as [BeatTheAiSkillId, number][]).map(
              ([skillId, xp]) => {
                const skill = SKILL_INFO[skillId];
                const isLevelUp = result.levelUps.includes(skillId);
                return (
                  <div key={skillId} className="flex items-center gap-2">
                    <span className="text-sm">{skill.icon}</span>
                    <span className="flex-1 text-xs text-gray-700">{skill.name}</span>
                    <span className="text-xs font-bold text-purple-600">+{xp} XP</span>
                    {isLevelUp && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        LEVEL UP!
                      </span>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* AI X-Ray card */}
      {xray && (
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-cyan-700">
            <span>🔬</span> AI X-Ray
          </h3>
          <p className="text-xs font-semibold text-gray-700">{xray.concept}</p>
          <p className="mt-1 text-xs text-gray-600">{xray.explanation}</p>
          <p className="mt-2 inline-block rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
            {xray.curriculumTag}
          </p>
        </div>
      )}

      {/* AI Points */}
      {result.aiPointsEarned > 0 && (
        <div className="text-center text-sm text-gray-500">
          +{result.aiPointsEarned} AI Points earned!
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-[0.98]"
        >
          Play Again
        </button>
        <button
          onClick={onViewStats}
          className="flex-1 rounded-xl border-2 border-purple-200 bg-white py-3 text-sm font-bold text-purple-600 transition-all hover:bg-purple-50 active:scale-[0.98]"
        >
          View Stats
        </button>
      </div>
    </div>
  );
}
