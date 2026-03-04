'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getTemplatesByType, getCategoriesByType, getDailySpark, type Template } from '@/lib/templates';
import { TemplateCarousel } from '@/components/shared/TemplateCarousel';
import { SurpriseButton } from '@/components/shared/SurpriseButton';
import type { MusicInput } from '@/lib/validators';

interface MusicPromptFormProps {
  onSubmit: (input: MusicInput & { templateId?: string }) => void;
  isLoading: boolean;
  canCreate: boolean;
  cooldownSeconds: number;
  creationsRemaining: number;
}

const MOODS = [
  { value: 'happy', emoji: '😊', label: 'Happy' },
  { value: 'chill', emoji: '😌', label: 'Chill' },
  { value: 'energetic', emoji: '⚡', label: 'Energetic' },
  { value: 'dreamy', emoji: '🌙', label: 'Dreamy' },
  { value: 'epic', emoji: '🔥', label: 'Epic' },
] as const;

const GENRES = ['pop', 'rock', 'electronic', 'classical', 'hip-hop', 'folk'] as const;
const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;

const THEME_CHIPS = [
  { emoji: '🌟', label: 'My dreams and goals' },
  { emoji: '🤝', label: 'Friends forever' },
  { emoji: '🌿', label: 'Nature and earth' },
  { emoji: '🚀', label: 'Adventure awaits' },
  { emoji: '💪', label: 'Never give up' },
  { emoji: '🎓', label: 'Learning is fun' },
];

const INSTRUMENTS = [
  { emoji: '🎸', label: 'Guitar' },
  { emoji: '🎹', label: 'Piano' },
  { emoji: '🥁', label: 'Drums' },
  { emoji: '🎺', label: 'Trumpet' },
  { emoji: '🎻', label: 'Violin' },
  { emoji: '🪘', label: 'Tabla' },
] as const;

export function MusicPromptForm({
  onSubmit,
  isLoading,
  canCreate,
  cooldownSeconds,
  creationsRemaining,
}: MusicPromptFormProps) {
  const [mood, setMood] = useState<string>('');
  const [genre, setGenre] = useState<string>('');
  const [theme, setTheme] = useState('');
  const [lyricsPrompt, setLyricsPrompt] = useState('');
  const [duration, setDuration] = useState(30);
  const [ageGroup, setAgeGroup] = useState<typeof AGE_GROUPS[number]>('10-12');
  const [instruments, setInstruments] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

  const musicTemplates = getTemplatesByType('music');
  const musicCategories = getCategoriesByType('music');
  const dailySpark = getDailySpark('music');

  const handleTemplateSelect = useCallback((template: Template) => {
    setTheme(template.promptText);
    setSelectedTemplateId(template.id);
    setError('');
    if (template.settings?.mood) setMood(template.settings.mood as string);
    if (template.settings?.genre) setGenre(template.settings.genre as string);
  }, []);

  const handleSubmit = () => {
    if (!mood) {
      setError('Pick a mood for your song!');
      return;
    }
    if (!genre) {
      setError('Choose a genre!');
      return;
    }
    setError('');
    onSubmit({
      mood: mood as MusicInput['mood'],
      genre: genre as MusicInput['genre'],
      theme: theme.trim() || undefined,
      lyricsPrompt: lyricsPrompt.trim() || undefined,
      duration,
      instruments: instruments.length > 0 ? instruments : undefined,
      ageGroup: ageGroup as MusicInput['ageGroup'],
      templateId: selectedTemplateId,
    });
  };

  const handleThemeChip = (label: string) => {
    setTheme(label);
    setSelectedTemplateId(undefined);
    setError('');
  };

  const toggleInstrument = (label: string) => {
    setInstruments((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : prev.length >= 4
          ? prev
          : [...prev, label]
    );
  };

  const isDisabled = !canCreate || isLoading || !mood || !genre;

  return (
    <div className="flex flex-col gap-5">
      {/* Mood selector grid */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">How should it feel?</label>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => { setMood(m.value); setError(''); }}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-all active:scale-95',
                mood === m.value
                  ? 'border-brand-orange bg-brand-orange/10'
                  : 'border-gray-200 bg-white hover:border-brand-orange/40'
              )}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className={cn(
                'text-xs font-medium',
                mood === m.value ? 'text-brand-orange' : 'text-gray-500'
              )}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Genre selector */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">Pick a genre</label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => { setGenre(g); setError(''); }}
              className={cn(
                'rounded-full px-3.5 py-2 text-sm font-medium capitalize transition-all active:scale-95',
                genre === g
                  ? 'bg-brand-orange text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Theme suggestion chips + Surprise Me */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {THEME_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleThemeChip(chip.label)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95',
              theme === chip.label
                ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                : 'border-gray-200 bg-white text-gray-600 hover:border-brand-orange/40'
            )}
          >
            <span>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
        <SurpriseButton type="music" accentColor="brand-orange" onSelect={handleTemplateSelect} />
      </div>

      {/* Template Carousel */}
      <TemplateCarousel
        templates={musicTemplates}
        categories={musicCategories}
        dailySpark={dailySpark}
        accentColor="brand-orange"
        onSelect={handleTemplateSelect}
      />

      {/* Error message */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* More options toggle */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-1 self-start text-sm font-medium text-brand-orange"
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
          {/* Theme text input */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Theme (optional)</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="A song about friendship, rainy days..."
              maxLength={200}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-brand-orange"
            />
          </div>

          {/* Lyrics prompt */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Lyrics idea (optional)</label>
            <textarea
              value={lyricsPrompt}
              onChange={(e) => setLyricsPrompt(e.target.value)}
              placeholder="Tell us what the song should say..."
              maxLength={500}
              rows={2}
              className="w-full resize-none rounded-xl border-2 border-gray-200 bg-white p-4 text-sm outline-none transition-colors focus:border-brand-orange"
            />
          </div>

          {/* Duration slider */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Duration: {duration}s
            </label>
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-brand-orange"
            />
          </div>

          {/* Instruments (multi-select, max 4) */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Instruments ({instruments.length}/4)
            </label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((inst) => (
                <button
                  key={inst.label}
                  onClick={() => toggleInstrument(inst.label)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all active:scale-95',
                    instruments.includes(inst.label)
                      ? 'bg-brand-cyan text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <span>{inst.emoji}</span>
                  {inst.label}
                </button>
              ))}
            </div>
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
          'bg-gradient-to-r from-brand-orange to-brand-orange/80',
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
          'Create My Song 🎵'
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
