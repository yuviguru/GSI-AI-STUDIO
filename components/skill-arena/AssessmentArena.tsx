'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type {
  SkillArenaChallenge,
  SkillArenaAnswer,
  SkillArenaDifficulty,
  SkillArenaModule,
} from '@gsi/types';
import { MODULE_INFO } from '@gsi/types';
import { McqOptions } from './McqOptions';
import { TextAnswer } from './TextAnswer';
import { SpeakingInput } from './SpeakingInput';
import { ListeningPlayer } from './ListeningPlayer';

interface AssessmentArenaProps {
  module: SkillArenaModule;
  difficulty: SkillArenaDifficulty;
  challenges: SkillArenaChallenge[];
  currentIndex: number;
  onSubmitAnswer: (answer: SkillArenaAnswer) => void;
  hasAnsweredCurrent: boolean;
  isLastChallenge: boolean;
}

const DIFFICULTY_LABELS: Record<SkillArenaDifficulty, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  hard: { label: 'Hard', color: 'bg-red-100 text-red-700' },
};

export function AssessmentArena({
  module,
  difficulty,
  challenges,
  currentIndex,
  onSubmitAnswer,
  hasAnsweredCurrent,
  isLastChallenge,
}: AssessmentArenaProps) {
  const challenge = challenges[currentIndex];
  if (!challenge) return null;

  const moduleInfo = MODULE_INFO[module];
  const diff = DIFFICULTY_LABELS[difficulty];
  const totalChallenges = challenges.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{moduleInfo.icon}</span>
          <span className="text-sm font-semibold text-gray-700">{moduleInfo.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${diff.color}`}>
            {diff.label}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-500">
          {currentIndex + 1}/{totalChallenges}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full bg-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + (hasAnsweredCurrent ? 1 : 0)) / totalChallenges) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Challenge card */}
      <ChallengeCard
        key={challenge.id}
        challenge={challenge}
        module={module}
        onSubmit={onSubmitAnswer}
        isLast={isLastChallenge}
        hasAnswered={hasAnsweredCurrent}
      />
    </div>
  );
}

interface ChallengeCardProps {
  challenge: SkillArenaChallenge;
  module: SkillArenaModule;
  onSubmit: (answer: SkillArenaAnswer) => void;
  isLast: boolean;
  hasAnswered: boolean;
}

function ChallengeCard({ challenge, module, onSubmit, isLast, hasAnswered }: ChallengeCardProps) {
  const [textValue, setTextValue] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(challenge.question.timeLimit);
  const submittedRef = useRef(false);

  const q = challenge.question;
  const isMcq = q.options && q.options.length > 0;

  // Reset state when challenge changes
  useEffect(() => {
    setTextValue('');
    setSelectedOption(null);
    startTimeRef.current = Date.now();
    setSecondsLeft(challenge.question.timeLimit);
    submittedRef.current = false;
  }, [challenge.id, challenge.question.timeLimit]);

  const handleSubmitAnswer = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    const timeUsed = Math.round((Date.now() - startTimeRef.current) / 1000);

    const answer: SkillArenaAnswer = {
      challengeId: challenge.id,
      timeUsedSeconds: timeUsed,
    };

    if (selectedOption) answer.selectedOption = selectedOption;
    if (textValue.trim()) {
      if (module === 'speaking') {
        answer.voiceTranscript = textValue.trim();
      } else {
        answer.text = textValue.trim();
      }
    }

    onSubmit(answer);
  }, [challenge.id, selectedOption, textValue, module, onSubmit]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [challenge.id]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && !submittedRef.current) {
      handleSubmitAnswer();
    }
  }, [secondsLeft, handleSubmitAnswer]);

  const canSubmit = isMcq ? selectedOption !== null : textValue.trim().length >= 3;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isLow = secondsLeft <= 15;
  const isCritical = secondsLeft <= 5;

  if (hasAnswered) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Timer */}
      <div className="flex justify-end">
        <motion.div
          animate={isCritical ? { scale: [1, 1.1, 1] } : isLow ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: isCritical ? 0.5 : 1 }}
          className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
            isCritical
              ? 'bg-red-100 text-red-600'
              : isLow
                ? 'bg-amber-100 text-amber-600'
                : 'bg-gray-100 text-gray-600'
          }`}
        >
          {minutes}:{seconds.toString().padStart(2, '0')}
        </motion.div>
      </div>

      {/* Question */}
      <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
        <p className="text-sm font-semibold text-gray-900">{q.text}</p>
      </div>

      {/* Passage (reading/speaking) */}
      {q.passage && module !== 'listening' && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm leading-relaxed text-gray-700">{q.passage}</p>
        </div>
      )}

      {/* Listening player */}
      {module === 'listening' && q.audioText && (
        <ListeningPlayer audioText={q.audioText} passage={q.passage} />
      )}

      {/* Input area */}
      {isMcq ? (
        <McqOptions
          options={q.options!}
          selected={selectedOption}
          onSelect={setSelectedOption}
        />
      ) : module === 'speaking' ? (
        <SpeakingInput value={textValue} onChange={setTextValue} />
      ) : (
        <TextAnswer value={textValue} onChange={setTextValue} />
      )}

      {/* Submit */}
      <button
        onClick={handleSubmitAnswer}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
      >
        {isLast ? 'Submit & Get Results' : 'Next Challenge'}
      </button>
    </motion.div>
  );
}
