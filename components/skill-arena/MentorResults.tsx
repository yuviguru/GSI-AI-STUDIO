'use client';

import { motion } from 'framer-motion';
import type {
  SkillArenaChallengeResult,
  SkillArenaMentorFeedback,
  SkillArenaXray,
  SkillArenaBandTitle,
  SkillArenaModule,
} from '@/types/mindx.types';
import { MODULE_INFO, SKILL_ARENA_BANDS } from '@/types/mindx.types';
import { Mascot } from '@/components/mascot/Mascot';
import { ConfettiCelebration } from '@/components/celebrations/ConfettiCelebration';

interface MentorResultsProps {
  module: SkillArenaModule;
  score: number;
  band: number;
  bandTitle: SkillArenaBandTitle;
  challengeResults: SkillArenaChallengeResult[];
  mentorFeedback: SkillArenaMentorFeedback;
  aiXray: SkillArenaXray;
  aiPointsEarned: number;
  previousBand: number | null;
  improved: boolean;
  onTryAgain: () => void;
  onViewProgress: () => void;
}

const BAND_COLORS: Record<number, string> = {
  1: 'from-gray-200 to-gray-300',
  2: 'from-blue-200 to-blue-300',
  3: 'from-green-200 to-green-300',
  4: 'from-purple-200 to-purple-300',
  5: 'from-amber-200 to-yellow-300',
};

export function MentorResults({
  module,
  score,
  band,
  bandTitle,
  challengeResults,
  mentorFeedback,
  aiXray,
  aiPointsEarned,
  previousBand,
  improved,
  onTryAgain,
  onViewProgress,
}: MentorResultsProps) {
  const moduleInfo = MODULE_INFO[module];
  const bandInfo = SKILL_ARENA_BANDS.find((b) => b.band === band);
  const bgGradient = BAND_COLORS[band] ?? BAND_COLORS[1];
  const showConfetti = band >= 4 || improved;

  return (
    <div className="space-y-5">
      <ConfettiCelebration trigger={showConfetti} variant="burst" />

      {/* Band announcement */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br ${bgGradient} p-6 text-center`}
      >
        <Mascot expression={band >= 3 ? 'celebrating' : 'thinking'} size="md" />
        <div className="text-4xl font-bold text-gray-900">Band {band}</div>
        <div className="text-lg font-semibold text-gray-700">{bandTitle}</div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{moduleInfo.icon}</span>
          <span className="text-sm text-gray-600">{moduleInfo.name} Assessment</span>
        </div>
        <div className="rounded-full bg-white/60 px-4 py-1 text-sm font-medium text-gray-700">
          Score: {score}/100
        </div>
        {improved && previousBand !== null && (
          <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
            Improved from Band {previousBand}!
          </span>
        )}
      </motion.div>

      {/* Koko mentor feedback */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        {/* Strengths */}
        <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
          <h3 className="mb-2 text-sm font-bold text-purple-700">What you did great</h3>
          <ul className="space-y-1">
            {mentorFeedback.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 text-green-500">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Growth areas */}
        <div className="rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50 p-4">
          <h3 className="mb-2 text-sm font-bold text-cyan-700">Areas to grow</h3>
          <ul className="space-y-1">
            {mentorFeedback.growthAreas.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 text-cyan-500">~</span>
                {g}
              </li>
            ))}
          </ul>
        </div>

        {/* Tips */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3">
          <p className="text-xs font-bold text-amber-700">Practice Tips</p>
          {mentorFeedback.tips.map((tip, i) => (
            <p key={i} className="mt-1 text-xs text-gray-700">{tip}</p>
          ))}
        </div>

        {/* Encouragement */}
        <div className="rounded-xl bg-purple-50 p-3 text-center">
          <p className="text-sm font-medium text-purple-700">{mentorFeedback.encouragement}</p>
        </div>
      </motion.div>

      {/* Challenge breakdown */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-gray-700">Challenge Breakdown</h3>
        <div className="space-y-2">
          {challengeResults.map((cr, i) => (
            <div key={cr.challengeId} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{cr.feedback}</span>
                  <span className="text-xs font-bold text-purple-600">{cr.score}/{cr.maxScore}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-purple-400"
                    style={{ width: `${(cr.score / cr.maxScore) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI X-Ray */}
      <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-cyan-700">
          <span>🔬</span> AI X-Ray
        </h3>
        <p className="text-xs font-semibold text-gray-700">{aiXray.concept}</p>
        <p className="mt-1 text-xs text-gray-600">{aiXray.explanation}</p>
        <p className="mt-2 inline-block rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
          {aiXray.curriculumTag}
        </p>
      </div>

      {/* AI Points */}
      {aiPointsEarned > 0 && (
        <div className="text-center text-sm text-gray-500">
          +{aiPointsEarned} AI Points earned!
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onTryAgain}
          className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-[0.98]"
        >
          Try Another Module
        </button>
        <button
          onClick={onViewProgress}
          className="flex-1 rounded-xl border-2 border-purple-200 bg-white py-3 text-sm font-bold text-purple-600 transition-all hover:bg-purple-50 active:scale-[0.98]"
        >
          View Progress
        </button>
      </div>
    </div>
  );
}
