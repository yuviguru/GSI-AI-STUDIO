'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Settings2, Smile, CloudRain, Zap, Moon, Flame, Music2, Guitar, Piano, Drum } from 'lucide-react';
import { CreditCostBadge } from '@/components/billing/CreditCostBadge';
import { cn } from '@/lib/utils';
import { getTemplatesByType, type Template } from '@/lib/templates';
import { SurpriseButton } from '@/components/shared/SurpriseButton';
import { MusicSampleCards } from '@/components/studios/music/MusicSampleCards';
import type { MusicInput } from '@/lib/validators';

interface MusicPromptFormProps {
  onSubmit: (input: MusicInput & { templateId?: string; remixedFromId?: string }) => void;
  isLoading: boolean;
  canCreate: boolean;
  cooldownSeconds: number;
  creationsRemaining: number;
  defaultPrompt?: string;
  remixFromId?: string;
}

// --- Mood chips (primary selector — required) ---
const MOOD_CHIPS = [
  { icon: Smile, value: 'happy', label: 'Happy' },
  { icon: CloudRain, value: 'chill', label: 'Chill' },
  { icon: Zap, value: 'energetic', label: 'Energetic' },
  { icon: Moon, value: 'dreamy', label: 'Dreamy' },
  { icon: Flame, value: 'epic', label: 'Epic' },
] as const;

// --- Genre chips (secondary — required) ---
const GENRE_CHIPS = [
  { icon: Music2, value: 'pop', label: 'Pop' },
  { icon: Guitar, value: 'rock', label: 'Rock' },
  { icon: Zap, value: 'electronic', label: 'Electronic' },
  { icon: Piano, value: 'classical', label: 'Classical' },
  { icon: Drum, value: 'hip-hop', label: 'Hip-Hop' },
  { icon: Music2, value: 'folk', label: 'Folk' },
] as const;

// --- Dynamic placeholders per mood ---
const MOOD_PLACEHOLDERS: Record<string, string> = {
  happy: 'A cheerful song about waking up excited for a new day...',
  chill: 'A peaceful melody for monsoon vibes and rainy afternoons...',
  energetic: 'An upbeat dance track for celebrating with friends...',
  dreamy: 'A dreamy instrumental about watching stars on a rooftop...',
  epic: 'A powerful anthem about never giving up and chasing dreams...',
};
const DEFAULT_PLACEHOLDER = "What should your song be about? A rainy day, dancing with friends...";

const INSTRUMENTS = ['Guitar', 'Piano', 'Drums', 'Trumpet', 'Violin', 'Tabla'] as const;
const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;
const DURATION_OPTIONS = [
  { label: 'Short', value: 15 },
  { label: 'Medium', value: 30 },
  { label: 'Long', value: 60 },
] as const;

export function MusicPromptForm({
  onSubmit,
  isLoading,
  canCreate,
  cooldownSeconds,
  creationsRemaining,
  defaultPrompt,
  remixFromId,
}: MusicPromptFormProps) {
  const [mood, setMood] = useState<string>('');
  const [genre, setGenre] = useState<string>('');
  const [theme, setTheme] = useState(defaultPrompt ?? '');
  const [lyricsPrompt, setLyricsPrompt] = useState('');
  const [duration, setDuration] = useState(30);
  const [ageGroup, setAgeGroup] = useState<typeof AGE_GROUPS[number]>('10-12');
  const [instruments, setInstruments] = useState<string[]>([]);
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

  const musicTemplates = getTemplatesByType('music');

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
      remixedFromId: remixFromId,
    });
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
  const moodChip = MOOD_CHIPS.find((c) => c.value === mood);
  const genreChipObj = GENRE_CHIPS.find((c) => c.value === genre);

  return (
    <div className="flex flex-col gap-3">
      {/* Remix banner */}
      {remixFromId && (
        <div className="flex items-center gap-2 rounded-2xl bg-brand-orange/10 px-4 py-3 text-sm font-medium text-brand-orange">
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
            : 'border-gray-200 focus-within:border-brand-orange focus-within:shadow-lg focus-within:shadow-brand-orange/10 focus-within:ring-2 focus-within:ring-brand-orange/20',
        )}
      >
        {/* Mood + Genre badges inside input */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <AnimatePresence>
            {moodChip && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setMood('')}
                className="flex items-center gap-1 rounded-full bg-brand-orange/10 px-2.5 py-1 text-xs font-semibold text-brand-orange transition-colors hover:bg-brand-orange/20"
              >
                <moodChip.icon className="h-3.5 w-3.5" />
                {moodChip.label}
                <X className="h-3 w-3" />
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {genreChipObj && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setGenre('')}
                className="flex items-center gap-1 rounded-full bg-brand-cyan/10 px-2.5 py-1 text-xs font-semibold text-brand-cyan transition-colors hover:bg-brand-cyan/20"
              >
                <genreChipObj.icon className="h-3.5 w-3.5" />
                {genreChipObj.label}
                <X className="h-3 w-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <textarea
          value={theme}
          onChange={(e) => { setTheme(e.target.value); setError(''); }}
          placeholder={MOOD_PLACEHOLDERS[mood] ?? DEFAULT_PLACEHOLDER}
          className={cn(
            'w-full resize-none rounded-t-2xl border-none bg-transparent p-4 pb-2 font-display text-lg leading-relaxed outline-none',
            'placeholder:text-gray-400',
            'min-h-[100px]',
            (moodChip || genreChipObj) && 'pr-44',
          )}
          maxLength={300}
          rows={3}
        />

        {/* Bottom toolbar: Surprise Me | Settings pill | count | Create */}
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
          <SurpriseButton type="music" accentColor="brand-orange" onSelect={handleTemplateSelect} />

          {/* Settings pill + overlay wrapper */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all',
                showSettings
                  ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange'
                  : 'border-gray-200 text-gray-400 hover:border-brand-orange/30 hover:text-gray-600',
              )}
            >
              <Settings2 className="h-3 w-3" />
              <span>{duration}s</span>
              <span className="text-gray-300">·</span>
              <span>{instruments.length > 0 ? `${instruments.length} inst` : 'Any'}</span>
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
                  className="absolute left-1/2 top-full z-20 mt-2 w-[360px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
                >
                  <div className="flex flex-col gap-3">
                    {/* Duration */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-500">Duration</label>
                      <div className="flex gap-1.5">
                        {DURATION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setDuration(opt.value)}
                            className={cn(
                              'flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-all active:scale-95',
                              duration === opt.value
                                ? 'bg-brand-orange text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                            )}
                          >
                            {opt.label} ({opt.value}s)
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Instruments */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                        Instruments ({instruments.length}/4)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {INSTRUMENTS.map((inst) => (
                          <button
                            key={inst}
                            onClick={() => toggleInstrument(inst)}
                            className={cn(
                              'rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95',
                              instruments.includes(inst)
                                ? 'bg-brand-cyan text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                            )}
                          >
                            {inst}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lyrics idea */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-500">Lyrics idea</label>
                      <textarea
                        value={lyricsPrompt}
                        onChange={(e) => setLyricsPrompt(e.target.value)}
                        placeholder="Tell us what the song should say..."
                        maxLength={300}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs outline-none transition-colors focus:border-brand-orange"
                      />
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
            <span className="text-xs text-gray-400">{theme.length}/300</span>
            <CreditCostBadge feature="music.compose" compact />

            {/* Create button */}
            <motion.button
              onClick={handleSubmit}
              disabled={isDisabled}
              whileTap={isDisabled ? {} : { scale: 0.95 }}
              className={cn(
                'group relative flex items-center gap-1.5 overflow-hidden rounded-full px-5 py-2 font-display text-sm font-bold text-white transition-all',
                'bg-gradient-to-r from-brand-orange to-brand-orange/80',
                isDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:shadow-md hover:shadow-brand-orange/25',
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

      {/* ── Mood Chips (required) ── */}
      <div>
        <p className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
          How should it feel?
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {MOOD_CHIPS.map((chip) => (
            <motion.button
              key={chip.value}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => { setMood(mood === chip.value ? '' : chip.value); setError(''); }}
              className={cn(
                'flex items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                mood === chip.value
                  ? 'border-brand-orange bg-brand-orange text-white ring-2 ring-brand-orange/30'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-brand-orange/40 hover:bg-brand-orange/5',
              )}
            >
              <chip.icon className="h-4 w-4" />
              {chip.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Genre Chips (required) ── */}
      <div>
        <p className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
          Pick a genre
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {GENRE_CHIPS.map((chip) => (
            <motion.button
              key={chip.value}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => { setGenre(genre === chip.value ? '' : chip.value); setError(''); }}
              className={cn(
                'flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-sm font-semibold transition-all',
                genre === chip.value
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

      {/* Hint */}
      {!mood && !genre && (
        <p className="text-center text-sm text-gray-400">
          Pick a mood and genre to get started!
        </p>
      )}

      {/* ── Sample Music Cards ── */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-500">
          {mood && moodChip ? (
            <>
              <moodChip.icon className="h-4 w-4" />
              {moodChip.label} music ideas
            </>
          ) : (
            'Music ideas to get you started'
          )}
        </p>
        <MusicSampleCards
          templates={musicTemplates}
          mood={mood || undefined}
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
