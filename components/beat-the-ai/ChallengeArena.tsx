'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { BeatTheAiPrompt, BeatTheAiDifficulty, BeatTheAiCategory } from '@gsi/types';
import { BEAT_THE_AI_CATEGORIES } from '@gsi/types';

interface ChallengeArenaProps {
  prompt: BeatTheAiPrompt;
  aiDifficulty: BeatTheAiDifficulty;
  onSubmit: (kidResponse: string, timeUsedSeconds: number) => void;
}

const DIFFICULTY_LABELS: Record<BeatTheAiDifficulty, { label: string; color: string }> = {
  easy: { label: 'Easy AI', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium AI', color: 'bg-amber-100 text-amber-700' },
  hard: { label: 'Hard AI', color: 'bg-red-100 text-red-700' },
};

/** Dynamic textarea rows by category */
const CATEGORY_ROWS: Partial<Record<BeatTheAiCategory, number>> = {
  comeback_king: 2,
  code_cracker: 4,
  fact_or_bluff: 4,
  math_wizard: 5,
  explain_it: 5,
  science_detective: 5,
  debate_champ: 6,
  rhyme_time: 6,
  story_sprint: 8,
};

/** Per-category placeholder text */
const CATEGORY_PLACEHOLDER: Partial<Record<BeatTheAiCategory, string>> = {
  story_sprint: 'Once upon a time...',
  rhyme_time: 'Roses are red, violets are blue...',
  fact_or_bluff: 'Write something surprising — real or fake!',
  comeback_king: 'Drop your wittiest one-liner here...',
  explain_it: 'Imagine you\'re talking to a 7-year-old...',
  debate_champ: 'State your strongest argument...',
  math_wizard: 'Show your working step by step...',
  science_detective: 'I think what would happen is...',
  code_cracker: 'The answer is... because...',
};

/** Per-category hints shown above the input */
const CATEGORY_HINTS: Partial<Record<BeatTheAiCategory, string>> = {
  math_wizard: '💡 Show your working! Explain each step.',
  debate_champ: '💡 Remember: be persuasive! Give strong reasons.',
  science_detective: '💡 Use cause and effect: "If X, then Y because..."',
  code_cracker: '💡 Explain HOW you solved it, not just the answer.',
};

/** Use single-line input for very short categories */
function usesSingleLineInput(category: BeatTheAiCategory): boolean {
  return category === 'comeback_king';
}

export function ChallengeArena({ prompt, aiDifficulty, onSubmit }: ChallengeArenaProps) {
  const [text, setText] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(prompt.timeLimit);
  const startTimeRef = useRef(Date.now());
  const submittedRef = useRef(false);

  const catInfo = BEAT_THE_AI_CATEGORIES.find((c) => c.id === prompt.category);
  const minChars = catInfo?.minChars ?? 10;
  const maxChars = catInfo?.maxChars ?? 2000;
  const canSubmit = text.trim().length >= minChars;
  const isSingleLine = usesSingleLineInput(prompt.category);
  const rows = CATEGORY_ROWS[prompt.category] ?? 6;

  const handleSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const timeUsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    onSubmit(text.trim() || '(no response)', timeUsed);
  }, [text, onSubmit]);

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
  }, []);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && !submittedRef.current) {
      handleSubmit();
    }
  }, [secondsLeft, handleSubmit]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isLow = secondsLeft <= 30;
  const isCritical = secondsLeft <= 10;

  const diff = DIFFICULTY_LABELS[aiDifficulty];
  const hint = CATEGORY_HINTS[prompt.category];

  // Extract debate side from prompt text for badge display
  const debateSideMatch = prompt.category === 'debate_champ'
    ? prompt.text.match(/You argue (FOR|AGAINST) (.+?)\./i)
    : null;

  return (
    <div className="space-y-4">
      {/* Header with timer and difficulty */}
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${diff.color}`}>
          {diff.label}
        </span>

        <motion.div
          animate={isCritical ? { scale: [1, 1.1, 1] } : isLow ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: isCritical ? 0.5 : 1 }}
          className={`rounded-full px-4 py-1.5 text-sm font-bold tabular-nums ${
            isCritical
              ? 'bg-red-100 text-red-600'
              : isLow
                ? 'bg-amber-100 text-amber-600'
                : 'bg-gray-100 text-gray-700'
          }`}
        >
          {minutes}:{seconds.toString().padStart(2, '0')}
        </motion.div>
      </div>

      {/* Prompt card */}
      <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-purple-500">
          {prompt.theme}
        </p>
        <p className="mt-2 text-base font-semibold text-gray-900 sm:text-lg">
          {prompt.text}
        </p>
      </div>

      {/* Debate side badge */}
      {debateSideMatch && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            🎯 Your side: {debateSideMatch[1]} {debateSideMatch[2]}
          </span>
          <span className="text-[10px] text-gray-400">(AI argues the opposite)</span>
        </div>
      )}

      {/* Category-specific hint */}
      {hint && (
        <p className="text-xs font-medium text-purple-600">{hint}</p>
      )}

      {/* Input area — single line for comeback_king, textarea for everything else */}
      <div className="relative">
        {isSingleLine ? (
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, maxChars))}
            placeholder={CATEGORY_PLACEHOLDER[prompt.category] ?? 'Type your response...'}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) handleSubmit();
            }}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, maxChars))}
            placeholder={CATEGORY_PLACEHOLDER[prompt.category] ?? 'Start writing your response...'}
            rows={rows}
            autoFocus
            className="w-full resize-none rounded-xl border-2 border-gray-200 p-4 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
        )}
        <div className={`${isSingleLine ? 'mt-1 text-right' : 'absolute bottom-3 right-3'} flex items-center gap-2`}>
          <span
            className={`text-xs ${
              text.length < minChars ? 'text-gray-400' : text.length > maxChars * 0.9 ? 'text-amber-500' : 'text-gray-400'
            }`}
          >
            {text.length}/{maxChars}
          </span>
        </div>
      </div>

      {/* Hint and submit */}
      {text.length > 0 && text.length < minChars && (
        <p className="text-xs text-amber-600">
          Write at least {minChars} characters ({minChars - text.length} more needed)
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
      >
        Submit My Response
      </button>
    </div>
  );
}
