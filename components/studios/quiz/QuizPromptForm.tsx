'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getTemplatesByType, getCategoriesByType, getDailySpark, type Template } from '@/lib/templates';
import { TemplateCarousel } from '@/components/shared/TemplateCarousel';
import { SurpriseButton } from '@/components/shared/SurpriseButton';
import type { QuizInput } from '@/lib/validators';

interface QuizPromptFormProps {
  onSubmit: (input: QuizInput & { templateId?: string; remixedFromId?: string }) => void;
  isLoading: boolean;
  canCreate: boolean;
  cooldownSeconds: number;
  creationsRemaining: number;
  defaultPrompt?: string;
  remixFromId?: string;
}

const SUGGESTION_CHIPS = [
  { emoji: '🚀', label: 'Space exploration' },
  { emoji: '🇮🇳', label: 'Indian history' },
  { emoji: '🧬', label: 'Human body' },
  { emoji: '🌍', label: 'World geography' },
  { emoji: '🐅', label: 'Indian wildlife' },
  { emoji: '💻', label: 'How computers work' },
];

const FORMATS = [
  { value: 'trivia', emoji: '🧠', label: 'Trivia' },
  { value: 'true_false', emoji: '✅', label: 'True / False' },
  { value: 'fill_blank', emoji: '✏️', label: 'Fill in the Blank' },
  { value: 'adventure', emoji: '🗺️', label: 'Adventure' },
] as const;

const DIFFICULTIES = [
  { value: 'beginner', emoji: '🌱', label: 'Beginner' },
  { value: 'intermediate', emoji: '🌿', label: 'Intermediate' },
  { value: 'advanced', emoji: '🌳', label: 'Advanced' },
] as const;

const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;

export function QuizPromptForm({
  onSubmit,
  isLoading,
  canCreate,
  cooldownSeconds,
  creationsRemaining,
  defaultPrompt,
  remixFromId,
}: QuizPromptFormProps) {
  const [topic, setTopic] = useState(defaultPrompt ?? '');
  const [format, setFormat] = useState<string>('trivia');
  const [difficulty, setDifficulty] = useState<string>('intermediate');
  const [questionCount, setQuestionCount] = useState(10);
  const [ageGroup, setAgeGroup] = useState<typeof AGE_GROUPS[number]>('10-12');
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

  const quizTemplates = getTemplatesByType('quiz');
  const quizCategories = getCategoriesByType('quiz');
  const dailySpark = getDailySpark('quiz');

  const handleTemplateSelect = useCallback((template: Template) => {
    setTopic(template.promptText);
    setSelectedTemplateId(template.id);
    setError('');
    if (template.settings?.difficulty) setDifficulty(template.settings.difficulty as string);
    if (template.settings?.format) setFormat(template.settings.format as string);
  }, []);

  const handleSubmit = () => {
    if (topic.trim().length < 2) {
      setError('What should the quiz be about? Tell us a topic!');
      return;
    }
    setError('');
    onSubmit({
      topic: topic.trim(),
      format: format as QuizInput['format'],
      difficulty: difficulty as QuizInput['difficulty'],
      questionCount,
      ageGroup,
      templateId: selectedTemplateId,
      remixedFromId: remixFromId,
    });
  };

  const handleChipClick = (label: string) => {
    setTopic(label);
    setSelectedTemplateId(undefined);
    setError('');
  };

  const isDisabled = !canCreate || isLoading || topic.trim().length < 2;

  return (
    <div className="flex flex-col gap-5">
      {/* Remix banner */}
      {remixFromId && (
        <div className="flex items-center gap-2 rounded-2xl bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-brand-cyan">
          <RemixBannerIcon />
          Remixed from another creation, make it your own!
        </div>
      )}

      {/* Topic input */}
      <div>
        <textarea
          value={topic}
          onChange={(e) => { setTopic(e.target.value); setError(''); }}
          placeholder="What should the quiz be about? Space, dinosaurs, Indian history..."
          className={cn(
            'w-full resize-none rounded-2xl border-2 bg-white p-4 font-display text-base leading-relaxed outline-none transition-colors',
            'placeholder:text-gray-400',
            error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-brand-cyan',
            'min-h-[100px]'
          )}
          maxLength={200}
          rows={3}
        />
        <div className="mt-1 flex justify-between px-1">
          {error ? (
            <span className="text-sm text-red-500">{error}</span>
          ) : (
            <span className="text-sm text-transparent">.</span>
          )}
          <span className="text-xs text-gray-400">{topic.length}/200</span>
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
              topic === chip.label
                ? 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan'
                : 'border-gray-200 bg-white text-gray-600 hover:border-brand-cyan/40'
            )}
          >
            <span>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
        <SurpriseButton type="quiz" accentColor="brand-cyan" onSelect={handleTemplateSelect} />
      </div>

      {/* Template Carousel */}
      <TemplateCarousel
        templates={quizTemplates}
        categories={quizCategories}
        dailySpark={dailySpark}
        accentColor="brand-cyan"
        onSelect={handleTemplateSelect}
      />

      {/* Format selector */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">Quiz Format</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-all active:scale-95',
                format === f.value
                  ? 'border-brand-cyan bg-brand-cyan/10'
                  : 'border-gray-200 bg-white hover:border-brand-cyan/40'
              )}
            >
              <span className="text-2xl">{f.emoji}</span>
              <span className={cn(
                'text-xs font-medium',
                format === f.value ? 'text-brand-cyan' : 'text-gray-500'
              )}>
                {f.label}
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
                  ? 'bg-brand-cyan text-white'
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
        className="flex items-center gap-1 self-start text-sm font-medium text-brand-cyan"
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
          {/* Question count slider */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Questions: {questionCount}
            </label>
            <input
              type="range"
              min={3}
              max={20}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-brand-cyan"
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
                      ? 'bg-brand-cyan text-white'
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
          'bg-gradient-to-r from-brand-cyan to-brand-cyan/80',
          isDisabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:shadow-lg hover:shadow-brand-cyan/25 active:scale-[0.98]'
        )}
      >
        {cooldownSeconds > 0 ? (
          `Wait ${cooldownSeconds}s...`
        ) : isLoading ? (
          'Creating...'
        ) : (
          'Create My Quiz 🎮'
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
