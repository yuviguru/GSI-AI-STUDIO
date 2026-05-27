'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Settings2, Castle, Rocket, Waves, TreePine, Crown, Clock, Compass, Building2, Gauge, Signal, SignalHigh } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTemplatesByType, type Template } from '@/lib/templates';
import { SurpriseButton } from '@/components/shared/SurpriseButton';
import { GameSampleCards } from '@/components/studios/game/GameSampleCards';
import type { GameInput } from '@/lib/validators';
import { CreditCostBadge } from '@/components/billing/CreditCostBadge';

interface GamePromptFormProps {
  onSubmit: (input: GameInput & { templateId?: string; remixedFromId?: string }) => void;
  isLoading: boolean;
  canCreate: boolean;
  cooldownSeconds: number;
  creationsRemaining: number;
  defaultPrompt?: string;
  remixFromId?: string;
}

// --- Setting chips with Lucide icons ---
const SETTING_CHIPS = [
  { icon: Castle, value: 'fantasy_world', label: 'Fantasy World' },
  { icon: Rocket, value: 'space_station', label: 'Space Station' },
  { icon: Waves, value: 'underwater_city', label: 'Underwater City' },
  { icon: TreePine, value: 'enchanted_forest', label: 'Enchanted Forest' },
  { icon: Crown, value: 'indian_palace', label: 'Indian Palace' },
  { icon: Clock, value: 'time_machine', label: 'Time Machine' },
  { icon: Compass, value: 'mystery_island', label: 'Mystery Island' },
  { icon: Building2, value: 'futuristic_city', label: 'Futuristic City' },
] as const;

// --- Difficulty chips ---
const DIFFICULTY_CHIPS = [
  { icon: Gauge, value: 'easy', label: 'Easy', desc: '6 scenes' },
  { icon: Signal, value: 'medium', label: 'Medium', desc: '8 scenes' },
  { icon: SignalHigh, value: 'hard', label: 'Hard', desc: '10 scenes' },
] as const;

const AGE_GROUPS = ['8-10', '10-12', '12-14', '14-17'] as const;

const SETTING_PLACEHOLDERS: Record<string, string> = {
  fantasy_world: "A brave warrior discovers a hidden portal in a magical kingdom...",
  space_station: "An astronaut kid finds a mysterious signal on a space station...",
  underwater_city: "Deep beneath the ocean, a hidden city needs your help...",
  enchanted_forest: "The talking trees whisper about a danger in the forest...",
  indian_palace: "Secret passages in an ancient palace lead to a forgotten treasure...",
  time_machine: "You accidentally activate a time machine and land in...",
  mystery_island: "Shipwrecked on a strange island, you discover clues that...",
  futuristic_city: "In the year 2150, robots and humans face a new challenge...",
};

const DEFAULT_PLACEHOLDER = "Describe your adventure... A treasure hunt in ancient India, escaping a maze on Mars...";

export function GamePromptForm({
  onSubmit,
  isLoading,
  canCreate,
  cooldownSeconds,
  creationsRemaining,
  defaultPrompt,
  remixFromId,
}: GamePromptFormProps) {
  const [premise, setPremise] = useState(defaultPrompt ?? '');
  const [setting, setSetting] = useState<string | undefined>();
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [characterName, setCharacterName] = useState('');
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

  const gameTemplates = getTemplatesByType('game');

  const handleTemplateSelect = useCallback((template: Template) => {
    setPremise(template.promptText);
    setSelectedTemplateId(template.id);
    setError('');
    if (template.settings?.setting) setSetting(template.settings.setting as string);
    if (template.settings?.difficulty) setDifficulty(template.settings.difficulty as 'easy' | 'medium' | 'hard');
  }, []);

  const handleSubmit = () => {
    if (premise.trim().length < 5) {
      setError('Tell us more about your adventure idea! What happens?');
      return;
    }
    setError('');
    onSubmit({
      premise: premise.trim(),
      setting: setting as GameInput['setting'],
      characterName: characterName.trim() || 'You',
      difficulty,
      ageGroup,
      templateId: selectedTemplateId,
      remixedFromId: remixFromId,
    });
  };

  const placeholder = setting ? (SETTING_PLACEHOLDERS[setting] ?? DEFAULT_PLACEHOLDER) : DEFAULT_PLACEHOLDER;
  const isDisabled = !canCreate || isLoading || premise.trim().length < 5;
  const settingChip = SETTING_CHIPS.find((c) => c.value === setting);
  const difficultyChip = DIFFICULTY_CHIPS.find((c) => c.value === difficulty);

  return (
    <div className="flex flex-col gap-3">
      {/* Remix banner */}
      {remixFromId && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600">
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
            : 'border-gray-200 focus-within:border-emerald-500 focus-within:shadow-lg focus-within:shadow-emerald-500/10 focus-within:ring-2 focus-within:ring-emerald-500/20',
        )}
      >
        {/* Setting + Difficulty badges */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          {settingChip && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              <settingChip.icon className="h-3.5 w-3.5" />
              {settingChip.label}
              <button
                onClick={() => setSetting(undefined)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {difficultyChip && (
            <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-600">
              <difficultyChip.icon className="h-3.5 w-3.5" />
              {difficultyChip.label}
            </span>
          )}
        </div>

        <textarea
          value={premise}
          onChange={(e) => { setPremise(e.target.value); setError(''); }}
          placeholder={placeholder}
          className={cn(
            'w-full resize-none rounded-t-2xl border-none bg-transparent p-4 pb-2 font-display text-lg leading-relaxed outline-none',
            'placeholder:text-gray-400',
            'min-h-[100px]',
            (settingChip || difficultyChip) && 'pr-52',
          )}
          maxLength={500}
          rows={3}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
          <SurpriseButton type="game" accentColor="emerald" onSelect={handleTemplateSelect} />

          {/* Settings pill + overlay */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all',
                showSettings
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                  : 'border-gray-200 text-gray-400 hover:border-emerald-500/30 hover:text-gray-600',
              )}
            >
              <Settings2 className="h-3 w-3" />
              <span>{characterName.trim() || 'You'}</span>
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
                    {/* Character Name */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-500">Character Name</label>
                      <input
                        type="text"
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        placeholder="You (default)"
                        maxLength={30}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none transition-colors focus:border-emerald-500"
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
                                ? 'bg-emerald-500 text-white'
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
            <CreditCostBadge feature="game.generate" compact />

            {/* Create button */}
            <motion.button
              onClick={handleSubmit}
              disabled={isDisabled}
              whileTap={isDisabled ? {} : { scale: 0.95 }}
              className={cn(
                'group relative flex items-center gap-1.5 overflow-hidden rounded-full px-5 py-2 font-display text-sm font-bold text-white transition-all',
                'bg-gradient-to-r from-emerald-500 to-teal-500',
                isDisabled
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:shadow-md hover:shadow-emerald-500/25',
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

      {/* ── Setting Chips ── */}
      <div>
        <p className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
          Pick a setting
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SETTING_CHIPS.map((chip) => (
            <motion.button
              key={chip.value}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => setSetting(setting === chip.value ? undefined : chip.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                setting === chip.value
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
              onClick={() => setDifficulty(chip.value as 'easy' | 'medium' | 'hard')}
              className={cn(
                'flex items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                difficulty === chip.value
                  ? 'border-teal-500 bg-teal-500 text-white ring-2 ring-teal-500/30'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-teal-400/40 hover:bg-teal-50',
              )}
            >
              <chip.icon className="h-4 w-4" />
              {chip.label} ({chip.desc})
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Sample Game Cards ── */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-500">
          Adventure ideas to get you started
        </p>
        <GameSampleCards
          templates={gameTemplates}
          setting={setting}
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
