'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ComicInput } from '@/lib/validators';

interface ComicPromptFormProps {
  onSubmit: (input: ComicInput & { remixedFromId?: string }) => void;
  isLoading: boolean;
  canCreate: boolean;
  cooldownSeconds: number;
  creationsRemaining: number;
  defaultPrompt?: string;
  remixFromId?: string;
}

const SUGGESTION_CHIPS = [
  { emoji: '🦸', label: 'A young superhero saves the day' },
  { emoji: '🚀', label: 'Friends explore outer space' },
  { emoji: '🐱', label: 'A cat with superpowers' },
  { emoji: '🏏', label: 'A cricket match with robots' },
  { emoji: '🌊', label: 'An underwater adventure' },
  { emoji: '🧙', label: 'A young wizard at school' },
];

const STYLES = [
  { value: 'cartoon' as const, label: 'Cartoon', emoji: '🎨' },
  { value: 'manga' as const, label: 'Manga', emoji: '📘' },
  { value: 'superhero' as const, label: 'Superhero', emoji: '🦸' },
  { value: 'indie' as const, label: 'Indie', emoji: '✏️' },
  { value: 'chibi' as const, label: 'Chibi', emoji: '🥰' },
] as const;

const PANEL_COUNTS = [4, 6, 8] as const;
const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;

export function ComicPromptForm({
  onSubmit,
  isLoading,
  canCreate,
  cooldownSeconds,
  creationsRemaining,
  defaultPrompt,
  remixFromId,
}: ComicPromptFormProps) {
  const [premise, setPremise] = useState(defaultPrompt ?? '');
  const [characters, setCharacters] = useState<Array<{ name: string; description?: string }>>([
    { name: '' },
  ]);
  const [style, setStyle] = useState<ComicInput['style']>('cartoon');
  const [panelCount, setPanelCount] = useState<4 | 6 | 8>(4);
  const [ageGroup, setAgeGroup] = useState<(typeof AGE_GROUPS)[number]>('10-12');
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (premise.trim().length < 5) {
      setError('Tell us more about your comic idea! What happens?');
      return;
    }
    const validChars = characters.filter((c) => c.name.trim().length > 0);
    if (validChars.length === 0) {
      setError('Add at least one character for your comic!');
      return;
    }
    setError('');
    onSubmit({
      premise: premise.trim(),
      characters: validChars.map((c) => ({
        name: c.name.trim(),
        description: c.description?.trim() || undefined,
      })),
      style,
      panelCount,
      ageGroup,
      remixedFromId: remixFromId,
    });
  };

  const handleChipClick = (label: string) => {
    setPremise(label);
    setError('');
  };

  const addCharacter = () => {
    if (characters.length < 4) {
      setCharacters([...characters, { name: '' }]);
    }
  };

  const updateCharacter = (index: number, field: 'name' | 'description', value: string) => {
    const updated = [...characters];
    updated[index] = { ...updated[index]!, [field]: value };
    setCharacters(updated);
  };

  const removeCharacter = (index: number) => {
    if (characters.length > 1) {
      setCharacters(characters.filter((_, i) => i !== index));
    }
  };

  const isDisabled = !canCreate || isLoading || premise.trim().length < 5;

  return (
    <div className="flex flex-col gap-5">
      {/* Remix banner */}
      {remixFromId && (
        <div className="flex items-center gap-2 rounded-2xl bg-brand-orange/10 px-4 py-3 text-sm font-medium text-brand-orange">
          Remixed from another creation — make it your own!
        </div>
      )}

      {/* Premise input */}
      <div>
        <textarea
          value={premise}
          onChange={(e) => {
            setPremise(e.target.value);
            setError('');
          }}
          placeholder="What's your comic about? Two friends discover a portal to a dinosaur world..."
          className={cn(
            'w-full resize-none rounded-2xl border-2 bg-white p-4 font-display text-base leading-relaxed outline-none transition-colors',
            'placeholder:text-gray-400',
            error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-brand-orange',
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
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleChipClick(chip.label)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95',
              premise === chip.label
                ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                : 'border-gray-200 bg-white text-gray-600 hover:border-brand-orange/40'
            )}
          >
            <span>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Characters */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">Characters</label>
        <div className="flex flex-col gap-3">
          {characters.map((char, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={char.name}
                onChange={(e) => updateCharacter(i, 'name', e.target.value)}
                placeholder={`Character ${i + 1} name`}
                className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-orange"
                maxLength={50}
              />
              <input
                type="text"
                value={char.description ?? ''}
                onChange={(e) => updateCharacter(i, 'description', e.target.value)}
                placeholder="Brief description (optional)"
                className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-orange"
                maxLength={100}
              />
              {characters.length > 1 && (
                <button
                  onClick={() => removeCharacter(i)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-gray-200 text-gray-400 transition-colors hover:border-red-300 hover:text-red-400"
                >
                  x
                </button>
              )}
            </div>
          ))}
          {characters.length < 4 && (
            <button
              onClick={addCharacter}
              className="self-start rounded-full border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-brand-orange hover:text-brand-orange"
            >
              + Add Character
            </button>
          )}
        </div>
      </div>

      {/* Style selector chips */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">Art Style</label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all active:scale-95',
                style === s.value
                  ? 'bg-brand-orange text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <span>{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel count */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">Panels</label>
        <div className="flex gap-2">
          {PANEL_COUNTS.map((count) => (
            <button
              key={count}
              onClick={() => setPanelCount(count)}
              className={cn(
                'rounded-full px-5 py-2.5 text-sm font-medium transition-all active:scale-95',
                panelCount === count
                  ? 'bg-brand-orange text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {count} panels
            </button>
          ))}
        </div>
      </div>

      {/* More options toggle */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-1 self-start text-sm font-medium text-brand-orange"
      >
        <motion.span animate={{ rotate: showOptions ? 90 : 0 }} className="inline-block">
          {'\u25B6'}
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
                      ? 'bg-brand-orange text-white'
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
          'bg-gradient-to-r from-brand-orange to-pink-500',
          isDisabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:shadow-lg hover:shadow-brand-orange/25 active:scale-[0.98]'
        )}
      >
        {cooldownSeconds > 0 ? (
          `Wait ${cooldownSeconds}s...`
        ) : isLoading ? (
          'Creating...'
        ) : (
          'Create My Comic'
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
