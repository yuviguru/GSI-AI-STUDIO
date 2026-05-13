'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type {
  BeatTheAiPrompt,
  BeatTheAiSubmitResponse,
  BeatTheAiXray,
  BeatTheAiSkillId,
  BeatTheAiScores,
} from '@gsi/types';
import { SKILL_INFO } from '@gsi/types';
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

const CRITERIA_LABELS: Record<keyof BeatTheAiScores, string> = {
  creativity: 'Creativity',
  funFactor: 'Fun Factor',
  accuracy: 'Accuracy',
  heart: 'Heart & Soul',
};

function ScoreBar({ label, kidScore, aiScore }: { label: string; kidScore: number; aiScore: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-gray-500">
        <span>{label}</span>
        <span>{kidScore} vs {aiScore}</span>
      </div>
      <div className="flex gap-1 h-2">
        <div
          className="rounded-l-full bg-purple-400 transition-all"
          style={{ width: `${(kidScore / 5) * 50}%` }}
        />
        <div
          className="rounded-r-full bg-cyan-400 transition-all"
          style={{ width: `${(aiScore / 5) * 50}%` }}
        />
      </div>
    </div>
  );
}

export function ResultsScreen({ result, prompt, aiXray, onPlayAgain, onViewStats }: ResultsScreenProps) {
  const config = RESULT_CONFIG[result.result];
  const xray = aiXray ?? result.aiXray;

  useEffect(() => {
    if (config.confetti) {
      // Confetti triggered via component prop
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
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-center gap-6 mb-4">
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
        {/* Detailed score breakdown */}
        <div className="space-y-2 border-t border-gray-100 pt-3">
          {(Object.keys(CRITERIA_LABELS) as (keyof BeatTheAiScores)[]).map((key) => (
            <ScoreBar
              key={key}
              label={CRITERIA_LABELS[key]}
              kidScore={result.kidScores[key]}
              aiScore={result.aiScores[key]}
            />
          ))}
        </div>
      </div>

      {/* AI Feedback */}
      {result.feedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {/* Kid feedback */}
          <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
            <h3 className="mb-1.5 text-sm font-bold text-purple-700">What the AI thinks of your work</h3>
            <p className="text-sm text-gray-700">{result.feedback.kidFeedback}</p>
          </div>

          {/* Pro tip */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3">
            <p className="text-xs font-bold text-amber-700">Pro Tip</p>
            <p className="text-xs text-gray-700">{result.feedback.tip}</p>
          </div>
        </motion.div>
      )}

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
