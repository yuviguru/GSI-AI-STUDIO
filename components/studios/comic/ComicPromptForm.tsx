'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getTemplatesByType, getCategoriesByType, getDailySpark, type Template } from '@/lib/templates';
import { TemplateCarousel } from '@/components/shared/TemplateCarousel';
import { SurpriseButton } from '@/components/shared/SurpriseButton';
import type { ComicInput } from '@/lib/validators';

interface ComicPromptFormProps {
  onSubmit: (input: ComicInput & { templateId?: string; remixedFromId?: string }) => void;
  isLoading: boolean;
  canCreate: boolean;
  cooldownSeconds: number;
  creationsRemaining: number;
  defaultPrompt?: string;
  remixFromId?: string;
}

const SUGGESTION_CHIPS = [
  { emoji: '🐉', label: 'Dragon vs Robot showdown' },
  { emoji: '🚀', label: 'Space quest with aliens' },
  { emoji: '🕵️', label: 'School mystery detective' },
  { emoji: '🌊', label: 'Underwater rescue mission' },
  { emoji: '⚡', label: 'Superhero team-up' },
  { emoji: '🦊', label: 'Clever fox adventure' },
];

const STYLES = ['cartoon', 'manga', 'superhero', 'indie', 'chibi'] as const;
const STYLE_EMOJIS: Record<string, string> = {
  cartoon: '🎨',
  manga: '✨',
  superhero: '💥',
  indie: '🖌️',
  chibi: '🥰',
};
const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;
const PANEL_COUNTS = [4, 6, 8] as const;

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
  const [style, setStyle] = useState<typeof STYLES[number]>('cartoon');
  const [panelCount, setPanelCount] = useState<number>(4);
  const [ageGroup, setAgeGroup] = useState<typeof AGE_GROUPS[number]>('10-12');
  const [char1, setChar1] = useState('');
  const [char2, setChar2] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

  const comicTemplates = getTemplatesByType('comic');
  const comicCategories = getCategoriesByType('comic');
  const dailySpark = getDailySpark('comic');

  const handleTemplateSelect = useCallback((template: Template) => {
    setPremise(template.promptText);
    setSelectedTemplateId(template.id);
    setError('');
    if (template.settings?.style) setStyle(template.settings.style as typeof STYLES[number]);
  }, []);

  const handleSubmit = () => {
    if (premise.trim().length < 5) {
      setError('Tell us more about your comic idea! What happens in the story?');
      return;
    }
    setError('');
    const characters = [char1, char2].filter((c) => c.trim().length > 0);
    onSubmit({
      premise: premise.trim(),
      style,
      panelCount,
      ageGroup,
      characters: characters.length > 0 ? characters : undefined,
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
        <div className="flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          Remixed from another comic — make it your own!
        </div>
      )}

      {/* Premise input */}
      <div>
        <textarea
          value={premise}
          onChange={(e) => { setPremise(e.target.value); setError(''); }}
          placeholder="What's your comic about? Two friends on a space adventure, a girl who can talk to animals..."
          className={cn(
            'w-full resize-none rounded-2xl border-2 bg-white p-4 font-display text-base leading-relaxed outline-none transition-colors',
            'placeholder:text-gray-400',
            error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-orange-400',
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
                ? 'border-orange-400 bg-orange-50 text-orange-600'
                : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'
            )}
          >
            <span>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
        <SurpriseButton type="comic" accentColor="brand-orange" onSelect={handleTemplateSelect} />
      </div>

      {/* Template Carousel */}
      <TemplateCarousel
        templates={comicTemplates}
        categories={comicCategories}
        dailySpark={dailySpark}
        accentColor="brand-orange"
        onSelect={handleTemplateSelect}
      />

      {/* Art Style selector (always visible) */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">Art Style</label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={cn(
                'rounded-full px-4 py-2.5 text-sm font-medium capitalize transition-all active:scale-95',
                style === s
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {STYLE_EMOJIS[s]} {s}
            </button>
          ))}
        </div>
      </div>

      {/* More options toggle */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-1 self-start text-sm font-medium text-orange-500"
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
          {/* Panel count */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Panels: {panelCount}
            </label>
            <div className="flex gap-2">
              {PANEL_COUNTS.map((count) => (
                <button
                  key={count}
                  onClick={() => setPanelCount(count)}
                  className={cn(
                    'flex-1 rounded-xl py-3 text-center text-sm font-bold transition-all active:scale-95',
                    panelCount === count
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {count} panels
                </button>
              ))}
            </div>
            {panelCount >= 6 && (
              <p className="mt-1.5 text-xs text-orange-500">
                More panels take longer to draw — about 30-60 seconds
              </p>
            )}
          </div>

          {/* Characters */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Characters (optional)
            </label>
            <div className="flex flex-col gap-2">
              <input
                value={char1}
                onChange={(e) => setChar1(e.target.value)}
                placeholder="e.g. Priya, tall girl with red hair and blue jacket"
                className="rounded-xl border-2 border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-orange-400"
                maxLength={100}
              />
              <input
                value={char2}
                onChange={(e) => setChar2(e.target.value)}
                placeholder="e.g. Arjun, stocky boy with glasses and green hoodie"
                className="rounded-xl border-2 border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-orange-400"
                maxLength={100}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Describe their appearance so the AI can draw them consistently
            </p>
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
                      ? 'bg-orange-500 text-white'
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
          'bg-gradient-to-r from-orange-500 to-amber-500',
          isDisabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:shadow-lg hover:shadow-orange-200 active:scale-[0.98]'
        )}
      >
        {cooldownSeconds > 0 ? (
          `Wait ${cooldownSeconds}s...`
        ) : isLoading ? (
          'Drawing...'
        ) : (
          'Draw My Comic ✏️'
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
