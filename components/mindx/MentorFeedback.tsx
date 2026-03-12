'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MascotSpeechBubble } from '@/components/mascot/MascotSpeechBubble';
import { BandScoreCard } from './BandScoreCard';
import type { SkillArenaEvaluateResponse } from '@/types/mindx.types';

interface MentorFeedbackProps {
  result: SkillArenaEvaluateResponse;
  onTryAgain: () => void;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function MentorFeedback({ result, onTryAgain }: MentorFeedbackProps) {
  const { mentorFeedback, aiXray, challengeResults } = result;

  return (
    <motion.div
      className="space-y-5"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Band Score */}
      <motion.div variants={fadeUp} className="flex justify-center">
        <BandScoreCard
          band={result.band}
          bandTitle={result.bandTitle}
          score={result.score}
          size="lg"
          improved={result.improved}
        />
      </motion.div>

      {/* Koko's encouragement */}
      <motion.div variants={fadeUp} className="flex justify-center">
        <MascotSpeechBubble
          expression={result.band >= 3 ? 'celebrating' : 'waving'}
          size="sm"
          message={mentorFeedback.encouragement}
          position="right"
        />
      </motion.div>

      {/* Points earned */}
      <motion.div
        variants={fadeUp}
        className="text-center text-sm font-semibold text-brand-purple"
      >
        +{result.aiPointsEarned} AI Points earned!
      </motion.div>

      {/* Strengths */}
      <motion.div variants={fadeUp}>
        <h3 className="mb-2 text-sm font-bold text-gray-800">
          What you did well
        </h3>
        <div className="space-y-1.5">
          {mentorFeedback.strengths.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"
            >
              <span className="mt-0.5 text-xs">+</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Growth areas */}
      <motion.div variants={fadeUp}>
        <h3 className="mb-2 text-sm font-bold text-gray-800">
          Areas to grow
        </h3>
        <div className="space-y-1.5">
          {mentorFeedback.growthAreas.map((g, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700"
            >
              <span className="mt-0.5 text-xs">*</span>
              <span>{g}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div variants={fadeUp}>
        <h3 className="mb-2 text-sm font-bold text-gray-800">
          Koko&apos;s Tips
        </h3>
        <div className="space-y-1.5">
          {mentorFeedback.tips.map((t, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700"
            >
              <span className="mt-0.5 text-xs">*</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Challenge breakdown */}
      <motion.div variants={fadeUp}>
        <h3 className="mb-2 text-sm font-bold text-gray-800">
          Challenge Breakdown
        </h3>
        <div className="space-y-2">
          {challengeResults.map((cr, i) => {
            const pct = cr.maxScore > 0 ? (cr.score / cr.maxScore) * 100 : 0;
            return (
              <div key={cr.challengeId || i} className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-600">Q{i + 1}</span>
                  <span className="font-mono text-gray-500">
                    {cr.score}/{cr.maxScore}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      pct >= 75 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-300',
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{cr.feedback}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* AI X-Ray */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3"
      >
        <h3 className="mb-1.5 text-sm font-bold text-purple-800">
          AI X-Ray
        </h3>
        <p className="text-sm leading-relaxed text-purple-700">
          {aiXray.explanation}
        </p>
        <span className="mt-2 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-600">
          {aiXray.curriculumTag.replace(/_/g, ' ')}
        </span>
      </motion.div>

      {/* Actions */}
      <motion.div variants={fadeUp} className="flex gap-3">
        <button
          onClick={onTryAgain}
          className={cn(
            'flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-colors',
            'bg-brand-purple hover:bg-brand-purple/90',
          )}
        >
          Try Another Module
        </button>
      </motion.div>
    </motion.div>
  );
}
