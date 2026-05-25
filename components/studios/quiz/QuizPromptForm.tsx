'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Settings2, Brain, CheckCircle, PenLine, Map, Sprout, Leaf, TreePine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTemplatesByType, type Template } from '@/lib/templates';
import { SurpriseButton } from '@/components/shared/SurpriseButton';
import { QuizSampleCards } from '@/components/studios/quiz/QuizSampleCards';
import type { QuizInput } from '@/lib/validators';
import { CreditCostBadge } from '@/components/billing/CreditCostBadge';

interface QuizPromptFormProps {
  onSubmit: (input: QuizInput & { templateId?: string; remixedFromId?: string }) => void;
  isLoading: boolean;
  canCreate: boolean;
  cooldownSeconds: number;
  creationsRemaining: number;
  defaultPrompt?: string;
  remixFromId?: string;
}

// --- Format chips ---
const FORMAT_CHIPS = [
  { icon: Brain, value: 'trivia', label: 'Trivia' },
  { icon: CheckCircle, value: 'true_false', label: 'True / False' },
  { icon: PenLine, value: 'fill_blank', label: 'Fill in Blank' },
  { icon: Map, value: 'adventure', label: 'Adventure' },
] as const;

// --- Difficulty chips ---
const DIFFICULTY_CHIPS = [
  { icon: Sprout, value: 'beginner', label: 'Beginner' },
  { icon: Leaf, value: 'intermediate', label: 'Intermediate' },
  { icon: TreePine, value: 'advanced', label: 'Advanced' },
] as const;

const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;
const QUESTION_OPTIONS = [
  { label: 'Quick', value: 5 },
  { label: 'Standard', value: 10 },
  { label: 'Deep', value: 15 },
] as const;

const DEFAULT_PLACEHOLDER = "What should the quiz be about? Space, dinosaurs, Indian history...";

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
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings overlay on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

  const quizTemplates = getTemplatesByType('quiz');

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

  const isDisabled = !canCreate || isLoading || topic.trim().length < 2;
  const formatChip = FORMAT_CHIPS.find((c) => c.value === format);
  const difficultyChip = DIFFICULTY_CHIPS.find((c) => c.value === difficulty);

  return (
    <div className="flex flex-col gap-3">
      {/* Remix banner */}
      {remixFromId && (
        <div className="flex items-center gap-2 rounded-2xl bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-brand-cyan">
          <RemixBannerIcon />
          Remixed from another creation — make it your own!
        </div>
      )}

      {/* ── Hero Input Area ── */}
      <div
        className={cn(
          'relative rounded-2xl border-2 bg-white shadow-sm transition-all',
          error
            ? 'border-red-300 focus-within:border-red-400'
            : 'border-gray-200 focus-within:border-brand-cyan focus-within:shadow-lg focus-within:shadow-brand-cyan/10 focus-within:ring-2 focus-within:ring-brand-cyan/20',
        )}
      >
        {/* Format + Difficulty badges */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          {formatChip && (
            <span className="flex items-center gap-1 rounded-full bg-brand-cyan/10 px-2.5 py-1 text-xs font-semibold text-brand-cyan">
              <formatChip.icon className="h-3.5 w-3.5" />
              {formatChip.label}
            </span>
          )}
          {difficultyChip && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              <difficultyChip.icon className="h-3.5 w-3.5" />
              {difficultyChip.label}
            </span>
          )}
        </div>

        <textarea
          value={topic}
          onChange={(e) => { setTopic(e.target.value); setError(''); }}
          placeholder={DEFAULT_PLACEHOLDER}
          className={cn(
            'w-full resize-none rounded-t-2xl border-none bg-transparent p-4 pb-2 font-display text-lg leading-relaxed outline-none',
            'placeholder:text-gray-400',
            'min-h-[100px]',
            'pr-52',
          )}
          maxLength={200}
          rows={3}
        />

        {/* Bottom toolbar: Surprise Me | Settings pill | count | Create */}
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
          <SurpriseButton type="quiz" accentColor="brand-cyan" onSelect={handleTemplateSelect} />

          {/* Settings pill + overlay */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all',
                showSettings
                  ? 'border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan'
                  : 'border-gray-200 text-gray-400 hover:border-brand-cyan/30 hover:text-gray-600',
              )}
            >
              <Settings2 className="h-3 w-3" />
              <span>{QUESTION_OPTIONS.find((o) => o.value === questionCount)?.label ?? questionCount + 'Q'}</span>
              <span className="text-gray-300">·</span>
              <span>{ageGroup}</span>
            </button>

            {/* Settings overlay dropdown */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 top-full z-20 mt-2 w-[300px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
                >
                  <div className="flex flex-col gap-3">
                    {/* Question Count */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-500">Questions</label>
                      <div className="flex gap-1.5">
                        {QUESTION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setQuestionCount(opt.value)}
                            className={cn(
                              'flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-all active:scale-95',
                              questionCount === opt.value
                                ? 'bg-brand-cyan text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                            )}
                          >
                            {opt.label} ({opt.value})
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Age Group */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-500">Age Group</label>
                      <div className="flex flex-wrap gap-1.5">
                        {AGE_GROUPS.map((a) => (
                          <button
                            key={a}
                            onClick={() => setAgeGroup(a)}
                            className={cn(
                              'rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95',
                              ageGroup === a
                                ? 'bg-brand-cyan text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                            )}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-500">{error}</span>}
            <span className="text-xs text-gray-400">{topic.length}/200</span>
            <CreditCostBadge feature="quiz.generate" compact />

            {/* Create button */}
            <motion.button
              onClick={handleSubmit}
              disabled={isDisabled}
              whileTap={isDisabled ? {} : { scale: 0.95 }}
              className={cn(
                'group relative flex items-center gap-1.5 overflow-hidden rounded-full px-5 py-2 font-display text-sm font-bold text-white transition-all',
                'bg-gradient-to-r from-brand-cyan to-brand-cyan/80',
                isDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:shadow-md hover:shadow-brand-cyan/25',
              )}
            >
              {!isDisabled && (
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              )}
              <span className="relative flex items-center gap-1.5">
                {cooldownSeconds > 0 ? (
                  `Wait ${cooldownSeconds}s`
                ) : isLoading ? (
                  'Creating...'
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Create
                  </>
                )}
              </span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Remaining count */}
      {creationsRemaining <= 3 && (
        <p className="-mt-3 text-right text-xs text-gray-400">
          {creationsRemaining} creation{creationsRemaining !== 1 ? 's' : ''} left today
        </p>
      )}

      {/* ── Format Chips ── */}
      <div>
        <p className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
          Quiz format
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {FORMAT_CHIPS.map((chip) => (
            <motion.button
              key={chip.value}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => setFormat(chip.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                format === chip.value
                  ? 'border-brand-cyan bg-brand-cyan text-white ring-2 ring-brand-cyan/30'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-brand-cyan/40 hover:bg-brand-cyan/5',
              )}
            >
              <chip.icon className="h-4 w-4" />
              {chip.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Difficulty Chips ── */}
      <div>
        <p className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
          Difficulty
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {DIFFICULTY_CHIPS.map((chip) => (
            <motion.button
              key={chip.value}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => setDifficulty(chip.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                difficulty === chip.value
                  ? 'border-emerald-500 bg-emerald-500 text-white ring-2 ring-emerald-500/30'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-400/40 hover:bg-emerald-50',
              )}
            >
              <chip.icon className="h-4 w-4" />
              {chip.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Sample Quiz Cards ── */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-500">
          Quiz ideas to get you started
        </p>
        <QuizSampleCards
          templates={quizTemplates}
          onSelect={handleTemplateSelect}
        />
      </div>
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
