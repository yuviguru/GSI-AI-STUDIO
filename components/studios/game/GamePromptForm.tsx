'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GameInput } from '@/lib/validators';

interface GamePromptFormProps {
  onSubmit: (input: GameInput) => void;
  isLoading: boolean;
  canCreate: boolean;
  cooldownSeconds: number;
  creationsRemaining: number;
}

const SUGGESTION_CHIPS = [
  { emoji: '🏰', label: 'A magical fort in Rajasthan' },
  { emoji: '🚀', label: 'Lost in space with alien friends' },
  { emoji: '🐅', label: 'Save the tiger in Sundarbans' },
  { emoji: '🏔️', label: 'Treasure hunt in the Himalayas' },
  { emoji: '🤖', label: 'A robot that comes alive at school' },
  { emoji: '🌊', label: 'Underwater city adventure' },
];

const SETTINGS = [
  { value: 'fantasy', emoji: '🏰', label: 'Fantasy' },
  { value: 'space', emoji: '🚀', label: 'Space' },
  { value: 'jungle', emoji: '🌿', label: 'Jungle' },
  { value: 'underwater', emoji: '🌊', label: 'Ocean' },
  { value: 'city', emoji: '🏙️', label: 'City' },
  { value: 'ancient_india', emoji: '🇮🇳', label: 'India' },
  { value: 'haunted_house', emoji: '👻', label: 'Spooky' },
  { value: 'school', emoji: '🏫', label: 'School' },
] as const;

const DIFFICULTIES = [
  { value: 'easy', emoji: '🌱', label: 'Easy' },
  { value: 'medium', emoji: '🌿', label: 'Medium' },
  { value: 'hard', emoji: '🌳', label: 'Hard' },
] as const;

const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;

export function GamePromptForm({
  onSubmit,
  isLoading,
  canCreate,
  cooldownSeconds,
  creationsRemaining,
}: GamePromptFormProps) {
  const [premise, setPremise] = useState('');
  const [setting, setSetting] = useState<string | undefined>(undefined);
  const [characterName, setCharacterName] = useState('');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [ageGroup, setAgeGroup] = useState<typeof AGE_GROUPS[number]>('10-12');
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (premise.trim().length < 5) {
      setError('Tell us a bit more about your adventure idea!');
      return;
    }
    setError('');
    onSubmit({
      premise: premise.trim(),
      setting: setting as GameInput['setting'],
      characterName: characterName.trim() || 'You',
      difficulty: difficulty as GameInput['difficulty'],
      ageGroup,
    });
  };

  const handleChipClick = (label: string) => {
    setPremise(label);
    setError('');
  };

  const isDisabled = !canCreate || isLoading || premise.trim().length < 5;

  return (
    <div className="flex flex-col gap-5">
      {/* Premise input */}
      <div>
        <textarea
          value={premise}
          onChange={(e) => { setPremise(e.target.value); setError(''); }}
          placeholder="Describe your adventure... A brave kid discovers a hidden door in their school that leads to..."
          className={cn(
            'w-full resize-none rounded-2xl border-2 bg-white p-4 font-display text-base leading-relaxed outline-none transition-colors',
            'placeholder:text-gray-400',
            error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emerald-500',
            'min-h-[100px]'
          )}
          maxLength={500}
          rows={3}
        />
        <div className="mt-1 flex justify-between px-1">
          {error ? (
            <span className="text-sm text-red-500">{error}</span>
          ) : (
            <span className="text-sm text-transparent">.</span>
          )}
          <span className="text-xs text-gray-400">{premise.length}/500</span>
        </div>
      </div>

      {/* Suggestion chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleChipClick(chip.label)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95',
              premise === chip.label
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
            )}
          >
            <span>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Setting selector */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">Setting</label>
        <div className="grid grid-cols-4 gap-2">
          {SETTINGS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSetting(setting === s.value ? undefined : s.value)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-all active:scale-95',
                setting === s.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-emerald-300'
              )}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className={cn(
                'text-xs font-medium',
                setting === s.value ? 'text-emerald-600' : 'text-gray-500'
              )}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty selector */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">Difficulty</label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-medium transition-all active:scale-95',
                difficulty === d.value
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <span>{d.emoji}</span>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* More options toggle */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-1 self-start text-sm font-medium text-emerald-600"
      >
        <motion.span animate={{ rotate: showOptions ? 90 : 0 }} className="inline-block">
          ▶
        </motion.span>
        More Options
      </button>

      {/* Collapsible options */}
      <motion.div
        initial={false}
        animate={{ height: showOptions ? 'auto' : 0, opacity: showOptions ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="flex flex-col gap-4 pb-2">
          {/* Character name */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Character Name
            </label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="You (default)"
              maxLength={30}
              className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-500"
            />
          </div>

          {/* Age group */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Age Group</label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAgeGroup(a)}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-sm font-medium transition-all active:scale-95',
                    ageGroup === a
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Create button */}
      <button
        onClick={handleSubmit}
        disabled={isDisabled}
        className={cn(
          'relative w-full rounded-full py-4 text-center font-display text-lg font-bold text-white transition-all',
          'bg-gradient-to-r from-emerald-500 to-teal-500',
          isDisabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:shadow-lg hover:shadow-emerald-200 active:scale-[0.98]'
        )}
      >
        {cooldownSeconds > 0 ? (
          `Wait ${cooldownSeconds}s...`
        ) : isLoading ? (
          'Creating...'
        ) : (
          'Create My Adventure 🕹️'
        )}
      </button>

      {/* Remaining count */}
      {creationsRemaining <= 3 && (
        <p className="text-center text-sm text-gray-400">
          {creationsRemaining} creation{creationsRemaining !== 1 ? 's' : ''} left today
        </p>
      )}
    </div>
  );
}
