'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SpeakingInput } from './SpeakingInput';
import { ListeningPlayer } from './ListeningPlayer';
import type {
  SkillArenaChallenge,
  SkillArenaAnswer,
  SkillArenaModule,
} from '@/types/mindx.types';

interface AssessmentArenaProps {
  challenge: SkillArenaChallenge;
  challengeIndex: number;
  totalChallenges: number;
  module: SkillArenaModule;
  onAnswer: (answer: SkillArenaAnswer) => void;
}

export function AssessmentArena({
  challenge,
  challengeIndex,
  totalChallenges,
  module,
  onAnswer,
}: AssessmentArenaProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [timeUsed, setTimeUsed] = useState(0);
  const [listeningDone, setListeningDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start timer
  useEffect(() => {
    setSelectedOption(null);
    setTextAnswer('');
    setTimeUsed(0);
    setListeningDone(false);

    timerRef.current = setInterval(() => {
      setTimeUsed((t) => t + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [challenge.id]);

  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const answer: SkillArenaAnswer = {
      challengeId: challenge.id,
      timeUsedSeconds: timeUsed,
    };

    if (selectedOption) answer.selectedOption = selectedOption;
    if (textAnswer) answer.text = textAnswer;

    onAnswer(answer);
  }, [challenge.id, selectedOption, textAnswer, timeUsed, onAnswer]);

  const handleSpeakingSubmit = useCallback(
    (transcript: string) => {
      if (timerRef.current) clearInterval(timerRef.current);

      onAnswer({
        challengeId: challenge.id,
        voiceTranscript: transcript,
        timeUsedSeconds: timeUsed,
      });
    },
    [challenge.id, timeUsed, onAnswer],
  );

  const { question } = challenge;
  const timeLimit = question.timeLimit;
  const timeRemaining = Math.max(0, timeLimit - timeUsed);
  const isTimeLow = timeRemaining <= 10 && timeRemaining > 0;
  const isTimeUp = timeRemaining <= 0;

  // Auto-submit when time runs out
  useEffect(() => {
    if (isTimeUp && timerRef.current) {
      handleSubmit();
    }
  }, [isTimeUp, handleSubmit]);

  const hasMcq = question.options && question.options.length > 0;
  const needsText =
    challenge.type === 'key_points' ||
    challenge.type === 'summarize' ||
    challenge.type === 'what_if' ||
    challenge.type === 'describe' ||
    challenge.type === 'respond';

  const canSubmit =
    (hasMcq && selectedOption) ||
    (needsText && textAnswer.trim().length > 0) ||
    module === 'speaking';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={challenge.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {/* Progress dots + timer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalChallenges }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  i < challengeIndex
                    ? 'bg-brand-purple'
                    : i === challengeIndex
                      ? 'bg-brand-purple/60 ring-2 ring-brand-purple/20'
                      : 'bg-gray-200',
                )}
              />
            ))}
            <span className="ml-2 text-xs text-gray-400">
              {challengeIndex + 1}/{totalChallenges}
            </span>
          </div>

          <div
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-mono font-medium',
              isTimeLow
                ? 'bg-red-50 text-red-500 animate-pulse'
                : 'bg-gray-100 text-gray-500',
            )}
          >
            {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
          </div>
        </div>

        {/* Challenge type label */}
        <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {challenge.type.replace(/_/g, ' ')}
        </div>

        {/* Question text */}
        <p className="text-base font-medium text-gray-800">{question.text}</p>

        {/* Passage (reading / read_aloud) */}
        {question.passage && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
            {question.passage}
          </div>
        )}

        {/* Listening audio player */}
        {module === 'listening' && question.audioText && (
          <ListeningPlayer
            audioText={question.audioText}
            onDone={() => setListeningDone(true)}
          />
        )}

        {/* Input area based on module type */}
        {module === 'speaking' ? (
          <SpeakingInput onSubmit={handleSpeakingSubmit} disabled={isTimeUp} />
        ) : (
          <div className="space-y-3">
            {/* MCQ options */}
            {hasMcq && (
              <div className="space-y-2">
                {question.options!.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedOption(option)}
                    disabled={module === 'listening' && !listeningDone}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                      selectedOption === option
                        ? 'border-brand-purple bg-brand-purple/5 text-brand-purple font-medium'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                      module === 'listening' && !listeningDone
                        ? 'cursor-not-allowed opacity-50'
                        : '',
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Text input for free-form answers */}
            {needsText && (
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className={cn(
                  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3',
                  'text-sm text-gray-700 placeholder-gray-400',
                  'focus:border-brand-purple/30 focus:outline-none focus:ring-1 focus:ring-brand-purple/30',
                  'min-h-[100px] resize-none',
                )}
                rows={4}
                disabled={isTimeUp}
              />
            )}

            {/* Submit button (not shown for speaking - it has its own) */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isTimeUp}
              className={cn(
                'w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors',
                'bg-brand-purple hover:bg-brand-purple/90',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {challengeIndex < totalChallenges - 1 ? 'Next' : 'Finish'}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
