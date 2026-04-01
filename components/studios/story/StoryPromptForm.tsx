'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getTemplatesByType, getCategoriesByType, getDailySpark, type Template } from '@/lib/templates';
import { TemplateCarousel } from '@/components/shared/TemplateCarousel';
import { SurpriseButton } from '@/components/shared/SurpriseButton';
import type { StoryInput } from '@/lib/validators';

interface StoryPromptFormProps {
  onSubmit: (input: StoryInput & { templateId?: string; remixedFromId?: string }) => void;
  isLoading: boolean;
  canCreate: boolean;
  cooldownSeconds: number;
  creationsRemaining: number;
  defaultPrompt?: string;
  remixFromId?: string;
}

const SUGGESTION_CHIPS = [
  { emoji: '🚀', label: 'A space adventure' },
  { emoji: '🐉', label: 'My pet dragon' },
  { emoji: '🏰', label: 'A magical kingdom' },
  { emoji: '🦸', label: 'A young superhero' },
  { emoji: '🌊', label: 'An underwater quest' },
  { emoji: '🤖', label: 'A friendly robot' },
];

const GENRES = ['adventure', 'sci-fi', 'fantasy', 'mystery', 'funny', 'friendship'] as const;
const STYLES = ['cartoon', 'watercolor', 'pixel-art', 'comic'] as const;
const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;

export function StoryPromptForm({
  onSubmit,
  isLoading,
  canCreate,
  cooldownSeconds,
  creationsRemaining,
  defaultPrompt,
  remixFromId,
}: StoryPromptFormProps) {
  const [premise, setPremise] = useState(defaultPrompt ?? '');
  const [genre, setGenre] = useState<string | undefined>();
  const [style, setStyle] = useState<typeof STYLES[number]>('cartoon');
  const [ageGroup, setAgeGroup] = useState<typeof AGE_GROUPS[number]>('10-12');
  const [pages, setPages] = useState(5);
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

  const storyTemplates = getTemplatesByType('story');
  const storyCategories = getCategoriesByType('story');
  const dailySpark = getDailySpark('story');

  const handleTemplateSelect = useCallback((template: Template) => {
    setPremise(template.promptText);
    setSelectedTemplateId(template.id);
    setError('');
    if (template.settings?.genre) setGenre(template.settings.genre as string);
    if (template.settings?.style) setStyle(template.settings.style as typeof STYLES[number]);
  }, []);

  const handleSubmit = () => {
    if (premise.trim().length < 5) {
      setError('Tell us a bit more about your story idea! What happens?');
      return;
    }
    setError('');
    onSubmit({
      premise: premise.trim(),
      genre: genre as StoryInput['genre'],
      style,
      ageGroup,
      pages,
      templateId: selectedTemplateId,
      remixedFromId: remixFromId,
    });
  };

  const handleChipClick = (label: string) => {
    setPremise(label);
    setSelectedTemplateId(undefined);
    setError('');
  };

  const isDisabled = !canCreate || isLoading || premise.trim().length < 5;

  return (
    <div className="flex flex-col gap-5">
      {/* Remix banner */}
      {remixFromId && (
        <div className="flex items-center gap-2 rounded-2xl bg-brand-purple/10 px-4 py-3 text-sm font-medium text-brand-purple">
          <RemixBannerIcon />
          Remixed from another creation, make it your own!
        </div>
      )}

      {/* Premise input */}
      <div>
        <textarea
          value={premise}
          onChange={(e) => { setPremise(e.target.value); setError(''); }}
          placeholder="What's your story about? A brave cat exploring space, a magical school..."
          className={cn(
            'w-full resize-none rounded-2xl border-2 bg-white p-4 font-display text-base leading-relaxed outline-none transition-colors',
            'placeholder:text-gray-400',
            error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-brand-purple',
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

      {/* Suggestion chips + Surprise Me */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleChipClick(chip.label)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95',
              premise === chip.label
                ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                : 'border-gray-200 bg-white text-gray-600 hover:border-brand-purple/40'
            )}
          >
            <span>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
        <SurpriseButton type="story" accentColor="brand-purple" onSelect={handleTemplateSelect} />
      </div>

      {/* Template Carousel */}
      <TemplateCarousel
        templates={storyTemplates}
        categories={storyCategories}
        dailySpark={dailySpark}
        accentColor="brand-purple"
        onSelect={handleTemplateSelect}
      />

      {/* More options toggle */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-1 self-start text-sm font-medium text-brand-purple"
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
          {/* Genre */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Genre</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(genre === g ? undefined : g)}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-sm font-medium capitalize transition-all active:scale-95',
                    genre === g
                      ? 'bg-brand-purple text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Art Style</label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-sm font-medium capitalize transition-all active:scale-95',
                    style === s
                      ? 'bg-brand-cyan text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pages */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Pages: {pages}
            </label>
            <input
              type="range"
              min={1}
              max={8}
              value={pages}
              onChange={(e) => setPages(Number(e.target.value))}
              className="w-full accent-brand-purple"
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
          'bg-gradient-to-r from-brand-purple to-brand-purple/80',
          isDisabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:shadow-lg hover:shadow-brand-purple/25 active:scale-[0.98]'
        )}
      >
        {cooldownSeconds > 0 ? (
          `Wait ${cooldownSeconds}s...`
        ) : isLoading ? (
          'Creating...'
        ) : (
          'Create My Story ✨'
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

function RemixBannerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
