'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Settings2, Paintbrush, BookImage, Zap, Pen, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTemplatesByType, type Template } from '@/lib/templates';
import { SurpriseButton } from '@/components/shared/SurpriseButton';
import { ComicSampleCards } from '@/components/studios/comic/ComicSampleCards';
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

// --- Art Style chips with Lucide icons ---
const STYLE_CHIPS = [
  { icon: Paintbrush, value: 'cartoon', label: 'Cartoon' },
  { icon: BookImage, value: 'manga', label: 'Manga' },
  { icon: Zap, value: 'superhero', label: 'Superhero' },
  { icon: Pen, value: 'indie', label: 'Indie' },
  { icon: Heart, value: 'chibi', label: 'Chibi' },
] as const;

const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;
const PANEL_OPTIONS = [
  { label: 'Short', value: 4 },
  { label: 'Standard', value: 6 },
  { label: 'Long', value: 8 },
] as const;

const DEFAULT_PLACEHOLDER = "What's your comic about? Two friends on a space adventure, a girl who can talk to animals...";

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
  const [style, setStyle] = useState<string>('cartoon');
  const [panelCount, setPanelCount] = useState(4);
  const [ageGroup, setAgeGroup] = useState<typeof AGE_GROUPS[number]>('10-12');
  const [char1, setChar1] = useState('');
  const [char2, setChar2] = useState('');
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

  const comicTemplates = getTemplatesByType('comic');

  const handleTemplateSelect = useCallback((template: Template) => {
    setPremise(template.promptText);
    setSelectedTemplateId(template.id);
    setError('');
    if (template.settings?.style) setStyle(template.settings.style as string);
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
      style: style as ComicInput['style'],
      panelCount,
      ageGroup,
      characters: characters.length > 0 ? characters : undefined,
      templateId: selectedTemplateId,
      remixedFromId: remixFromId,
    });
  };

  const isDisabled = !canCreate || isLoading || premise.trim().length < 5;
  const styleChip = STYLE_CHIPS.find((c) => c.value === style);

  return (
    <div className="flex flex-col gap-3">
      {/* Remix banner */}
      {remixFromId && (
        <div className="flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-600">
          <RemixBannerIcon />
          Remixed from another comic — make it your own!
        </div>
      )}

      {/* ── Hero Input Area ── */}
      <div
        className={cn(
          'relative rounded-2xl border-2 bg-white shadow-sm transition-all',
          error
            ? 'border-red-300 focus-within:border-red-400'
            : 'border-gray-200 focus-within:border-orange-400 focus-within:shadow-lg focus-within:shadow-orange-400/10 focus-within:ring-2 focus-within:ring-orange-400/20',
        )}
      >
        {/* Style badge */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          {styleChip && (
            <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600">
              <styleChip.icon className="h-3.5 w-3.5" />
              {styleChip.label}
            </span>
          )}
        </div>

        <textarea
          value={premise}
          onChange={(e) => { setPremise(e.target.value); setError(''); }}
          placeholder={DEFAULT_PLACEHOLDER}
          className={cn(
            'w-full resize-none rounded-t-2xl border-none bg-transparent p-4 pb-2 font-display text-lg leading-relaxed outline-none',
            'placeholder:text-gray-400',
            'min-h-[100px]',
            styleChip && 'pr-32',
          )}
          maxLength={500}
          rows={3}
        />

        {/* Bottom toolbar: Surprise Me | Settings pill | count | Create */}
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
          <SurpriseButton type="comic" accentColor="brand-orange" onSelect={handleTemplateSelect} />

          {/* Settings pill + overlay */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all',
                showSettings
                  ? 'border-orange-400/40 bg-orange-400/10 text-orange-500'
                  : 'border-gray-200 text-gray-400 hover:border-orange-400/30 hover:text-gray-600',
              )}
            >
              <Settings2 className="h-3 w-3" />
              <span>{PANEL_OPTIONS.find((o) => o.value === panelCount)?.label ?? panelCount + ' panels'}</span>
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
                    {/* Panel Count */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-500">Panels</label>
                      <div className="flex gap-1.5">
                        {PANEL_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setPanelCount(opt.value)}
                            className={cn(
                              'flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-all active:scale-95',
                              panelCount === opt.value
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                            )}
                          >
                            {opt.label} ({opt.value})
                          </button>
                        ))}
                      </div>
                      {panelCount >= 6 && (
                        <p className="mt-1.5 text-[10px] text-orange-500">
                          More panels take longer — about 30-60 seconds
                        </p>
                      )}
                    </div>

                    {/* Characters */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-500">Characters (optional)</label>
                      <div className="flex flex-col gap-1.5">
                        <input
                          value={char1}
                          onChange={(e) => setChar1(e.target.value)}
                          placeholder="e.g. Priya, tall girl with red hair"
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none transition-colors focus:border-orange-400"
                          maxLength={100}
                        />
                        <input
                          value={char2}
                          onChange={(e) => setChar2(e.target.value)}
                          placeholder="e.g. Arjun, boy with glasses"
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none transition-colors focus:border-orange-400"
                          maxLength={100}
                        />
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
                                ? 'bg-orange-500 text-white'
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
            <span className="text-xs text-gray-400">{premise.length}/500</span>

            {/* Create button */}
            <motion.button
              onClick={handleSubmit}
              disabled={isDisabled}
              whileTap={isDisabled ? {} : { scale: 0.95 }}
              className={cn(
                'group relative flex items-center gap-1.5 overflow-hidden rounded-full px-5 py-2 font-display text-sm font-bold text-white transition-all',
                'bg-gradient-to-r from-orange-500 to-amber-500',
                isDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:shadow-md hover:shadow-orange-500/25',
              )}
            >
              {!isDisabled && (
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              )}
              <span className="relative flex items-center gap-1.5">
                {cooldownSeconds > 0 ? (
                  `Wait ${cooldownSeconds}s`
                ) : isLoading ? (
                  'Drawing...'
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

      {/* ── Art Style Chips ── */}
      <div>
        <p className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
          Art style
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {STYLE_CHIPS.map((chip) => (
            <motion.button
              key={chip.value}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => setStyle(chip.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                style === chip.value
                  ? 'border-orange-500 bg-orange-500 text-white ring-2 ring-orange-500/30'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-orange-400/40 hover:bg-orange-50',
              )}
            >
              <chip.icon className="h-4 w-4" />
              {chip.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Sample Comic Cards ── */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-500">
          Comic ideas to get you started
        </p>
        <ComicSampleCards
          templates={comicTemplates}
          style={style}
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
