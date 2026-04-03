'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Settings2, Map, Rocket, Wand2, Search, Laugh, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTemplatesByType, type Template } from '@/lib/templates';
import { SurpriseButton } from '@/components/shared/SurpriseButton';
import { SamplePromptCards } from '@/components/studios/story/SamplePromptCards';
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

// --- Genre chips (contextual mode switching) ---
const GENRE_CHIPS = [
  { icon: Map, genre: 'adventure', label: 'Adventure' },
  { icon: Rocket, genre: 'sci-fi', label: 'Sci-Fi' },
  { icon: Wand2, genre: 'fantasy', label: 'Fantasy' },
  { icon: Search, genre: 'mystery', label: 'Mystery' },
  { icon: Laugh, genre: 'funny', label: 'Funny' },
  { icon: Users, genre: 'friendship', label: 'Friendship' },
] as const;

// --- Dynamic placeholders per genre ---
const GENRE_PLACEHOLDERS: Record<string, string> = {
  adventure: 'A brave explorer discovers a hidden temple in...',
  'sci-fi': 'In the year 2150, a young inventor builds...',
  fantasy: 'In a magical world where animals can talk...',
  mystery: 'Strange things are happening at school when...',
  funny: 'The funniest thing happened when my pet...',
  friendship: 'Two unlikely friends go on an adventure to...',
};
const DEFAULT_PLACEHOLDER = "What's your story about? A brave cat in space, a magical school...";

const STYLES = ['cartoon', 'watercolor', 'pixel-art', 'comic'] as const;
const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;
const PAGE_OPTIONS = [
  { label: 'Short', value: 3 },
  { label: 'Medium', value: 5 },
  { label: 'Long', value: 8 },
] as const;

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
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [showMore, setShowMore] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings overlay on outside click
  useEffect(() => {
    if (!showMore) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMore]);

  const storyTemplates = getTemplatesByType('story');

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

  const handleGenreClick = (g: string) => {
    setGenre(genre === g ? undefined : g);
  };

  const isDisabled = !canCreate || isLoading || premise.trim().length < 5;
  const genreChip = GENRE_CHIPS.find((c) => c.genre === genre);

  return (
    <div className="flex flex-col gap-3">
      {/* Remix banner */}
      {remixFromId && (
        <div className="flex items-center gap-2 rounded-2xl bg-brand-purple/10 px-4 py-3 text-sm font-medium text-brand-purple">
          <RemixBannerIcon />
          Remixed from another creation — make it your own!
        </div>
      )}

      {/* ── Hero Input Area with Create Button ── */}
      <div
        className={cn(
          'relative rounded-2xl border-2 bg-white shadow-sm transition-all',
          error
            ? 'border-red-300 focus-within:border-red-400'
            : 'border-gray-200 focus-within:border-brand-purple focus-within:shadow-lg focus-within:shadow-brand-purple/10 focus-within:ring-2 focus-within:ring-brand-purple/20',
        )}
      >
        {/* Genre badge inside input */}
        <AnimatePresence>
          {genreChip && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setGenre(undefined)}
              className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-brand-purple/10 px-2.5 py-1 text-xs font-semibold text-brand-purple transition-colors hover:bg-brand-purple/20"
            >
              <genreChip.icon className="h-3.5 w-3.5" />
              {genreChip.label}
              <X className="h-3 w-3" />
            </motion.button>
          )}
        </AnimatePresence>

        <textarea
          value={premise}
          onChange={(e) => { setPremise(e.target.value); setError(''); }}
          placeholder={GENRE_PLACEHOLDERS[genre ?? ''] ?? DEFAULT_PLACEHOLDER}
          className={cn(
            'w-full resize-none rounded-t-2xl border-none bg-transparent p-4 pb-2 font-display text-lg leading-relaxed outline-none',
            'placeholder:text-gray-400',
            'min-h-[100px]',
            genreChip && 'pr-28',
          )}
          maxLength={500}
          rows={3}
        />

        {/* Bottom toolbar: Surprise + Settings pill + count + Create */}
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
          <SurpriseButton type="story" accentColor="brand-purple" onSelect={handleTemplateSelect} />

          {/* Settings pill + overlay wrapper */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowMore(!showMore)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all',
                showMore
                  ? 'border-brand-purple/40 bg-brand-purple/10 text-brand-purple'
                  : 'border-gray-200 text-gray-400 hover:border-brand-purple/30 hover:text-gray-600',
              )}
            >
              <Settings2 className="h-3 w-3" />
              <span className="capitalize">{style}</span>
              <span className="text-gray-300">·</span>
              <span>{PAGE_OPTIONS.find((o) => o.value === pages)?.label}</span>
              <span className="text-gray-300">·</span>
              <span>{ageGroup}</span>
            </button>

            {/* Settings overlay dropdown — opens below */}
            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 top-full z-20 mt-2 w-[340px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
                >
                <div className="flex flex-col gap-3">
                  {/* Art Style */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-500">Art Style</label>
                    <div className="flex flex-wrap gap-1.5">
                      {STYLES.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStyle(s)}
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-medium capitalize transition-all active:scale-95',
                            style === s
                              ? 'bg-brand-cyan text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Story Length */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-500">Story Length</label>
                    <div className="flex gap-1.5">
                      {PAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPages(opt.value)}
                          className={cn(
                            'flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-all active:scale-95',
                            pages === opt.value
                              ? 'bg-brand-purple text-white'
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
                              ? 'bg-brand-orange text-white'
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
                'bg-gradient-to-r from-brand-purple to-brand-purple/80',
                isDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:shadow-md hover:shadow-brand-purple/25',
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

      {/* ── Genre Chips ── */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {GENRE_CHIPS.map((chip) => (
          <motion.button
            key={chip.genre}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => handleGenreClick(chip.genre)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all',
              genre === chip.genre
                ? 'border-brand-purple bg-brand-purple text-white ring-2 ring-brand-purple/30'
                : 'border-gray-200 bg-white text-gray-600 hover:border-brand-purple/40 hover:bg-brand-purple/5',
            )}
          >
            <chip.icon className="h-4 w-4" />
            {chip.label}
          </motion.button>
        ))}
      </div>

      {/* Hint when empty */}
      {!genre && !premise && (
        <p className="text-center text-sm text-gray-400">
          Pick a genre or just start typing your idea!
        </p>
      )}

      {/* ── Sample Prompt Cards ── */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-500">
          {genre && genreChip ? (
            <>
              <genreChip.icon className="h-4 w-4" />
              {genreChip.label} story ideas
            </>
          ) : (
            'Story ideas to get you started'
          )}
        </p>
        <SamplePromptCards
          templates={storyTemplates}
          genre={genre}
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
