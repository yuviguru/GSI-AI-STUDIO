'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AiXrayPopup } from '@/components/learning/AiXrayPopup';
import { ShareButton } from '@/components/shared/ShareButton';
import type { AiXrayData } from '@/types';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface QuizData {
  title: string;
  topic: string;
  difficulty: string;
  format: string;
  questions: QuizQuestion[];
}

interface QuizPlayerProps {
  quiz: QuizData;
  aiXray: AiXrayData;
  onCreateAnother: () => void;
  creationId?: string;
  readOnly?: boolean;
}

type AnswerState = 'unanswered' | 'correct' | 'wrong';

export function QuizPlayer({ quiz, aiXray, onCreateAnother, creationId, readOnly = false }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showXray, setShowXray] = useState(false);

  // Auto-show X-Ray on quiz completion (first time per session, skip in readOnly mode)
  useEffect(() => {
    if (!isFinished || readOnly) return;
    const key = 'gsi-xray-shown-quiz';
    if (!sessionStorage.getItem(key)) {
      setShowXray(true);
      sessionStorage.setItem(key, 'true');
    }
  }, [isFinished, readOnly]);

  const totalQuestions = quiz.questions.length;
  const currentQuestion = quiz.questions[currentIndex];
  const progress = ((currentIndex) / totalQuestions) * 100;

  const handleAnswer = useCallback((option: string) => {
    if (answerState !== 'unanswered' || !currentQuestion) return;
    setSelectedAnswer(option);
    if (option === currentQuestion.answer) {
      setAnswerState('correct');
      setScore((s) => s + 1);
    } else {
      setAnswerState('wrong');
    }
  }, [answerState, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= totalQuestions) {
      setIsFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setAnswerState('unanswered');
    }
  }, [currentIndex, totalQuestions]);

  const handleReplay = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswerState('unanswered');
    setScore(0);
    setIsFinished(false);
  };

  // Final score screen
  if (isFinished) {
    const pct = Math.round((score / totalQuestions) * 100);
    const emoji = pct >= 80 ? '\uD83C\uDFC6' : pct >= 60 ? '\uD83C\uDF1F' : pct >= 40 ? '\uD83D\uDC4D' : '\uD83D\uDCAA';
    const message = pct >= 80
      ? 'Amazing! You nailed it!'
      : pct >= 60
        ? 'Great job! Well done!'
        : pct >= 40
          ? 'Nice try! Keep learning!'
          : 'Keep going! You\'ll do better next time!';

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
          <h2 className="font-display text-2xl font-bold text-gray-900">{message}</h2>
          <p className="mt-2 text-gray-500">
            You scored <span className="font-bold text-brand-cyan">{score}/{totalQuestions}</span> ({pct}%)
          </p>
        </motion.div>

        {/* Score bar */}
        <div className="w-full max-w-xs">
          <div className="h-4 overflow-hidden rounded-full bg-gray-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-purple"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex w-full gap-3">
          <ShareButton
            creationId={creationId ?? ''}
            creationTitle={quiz.title}
            creationType="quiz"
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
              AI X-Ray {'\uD83D\uDD0D'}
            </button>
          )}
        </div>

        <button
          onClick={handleReplay}
          className="w-full rounded-full bg-gray-100 py-3 text-center font-bold text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
        >
          Play Again
        </button>

        {!readOnly && (
          <button
            onClick={onCreateAnother}
            className="w-full rounded-full bg-gray-100 py-3 text-center font-bold text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
          >
            Create Another Quiz
          </button>
        )}

        {!readOnly && (
          <AiXrayPopup isOpen={showXray} onClose={() => setShowXray(false)} aiXray={aiXray} />
        )}
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
            <motion.div
              className="h-full rounded-full bg-brand-cyan"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold text-gray-500">
          {currentIndex + 1}/{totalQuestions}
        </span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="font-display text-lg font-semibold leading-relaxed text-gray-900">
              {currentQuestion.question}
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === currentQuestion.answer;
              let optionStyle = 'border-gray-200 bg-white text-gray-700 hover:border-brand-cyan/40';

              if (answerState !== 'unanswered') {
                if (isCorrectOption) {
                  optionStyle = 'border-green-400 bg-green-50 text-green-800';
                } else if (isSelected && !isCorrectOption) {
                  optionStyle = 'border-red-400 bg-red-50 text-red-800';
                } else {
                  optionStyle = 'border-gray-200 bg-gray-50 text-gray-400';
                }
              } else if (isSelected) {
                optionStyle = 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan';
              }

              return (
                <motion.button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={answerState !== 'unanswered'}
                  whileTap={answerState === 'unanswered' ? { scale: 0.98 } : undefined}
                  className={cn(
                    'w-full rounded-2xl border-2 px-5 py-4 text-left font-medium transition-all',
                    optionStyle,
                    answerState === 'unanswered' && 'cursor-pointer active:scale-[0.98]'
                  )}
                >
                  {option}
                  {answerState !== 'unanswered' && isCorrectOption && (
                    <span className="ml-2">{'\u2713'}</span>
                  )}
                  {answerState === 'wrong' && isSelected && !isCorrectOption && (
                    <span className="ml-2">{'\u2717'}</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Feedback + explanation */}
          <AnimatePresence>
            {answerState !== 'unanswered' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={cn(
                  'rounded-2xl p-4',
                  answerState === 'correct' ? 'bg-green-50' : 'bg-amber-50'
                )}>
                  <p className="font-display font-bold">
                    {answerState === 'correct' ? '\uD83C\uDF89 Correct!' : '\uD83D\uDCA1 Not quite!'}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    {currentQuestion.explanation}
                  </p>
                </div>

                <button
                  onClick={handleNext}
                  className="mt-4 w-full rounded-full bg-brand-cyan py-3.5 text-center font-display font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]"
                >
                  {currentIndex + 1 >= totalQuestions ? 'See My Score' : 'Next Question \u2192'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Score tracker */}
      <div className="text-center text-sm text-gray-400">
        Score: <span className="font-semibold text-brand-cyan">{score}</span> / {currentIndex + (answerState !== 'unanswered' ? 1 : 0)}
      </div>
    </div>
  );
}
