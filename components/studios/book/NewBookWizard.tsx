'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Sparkles, Trash2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import {
  BOOK_FONTS,
  BOOK_KIT_PRESETS,
  BOOK_SIZES,
  BOOK_TYPE_CARDS,
  FREE_TIER_PAGE_LIMIT,
} from '@/lib/templates/bookTemplates';
import { useBookList } from '@/hooks/useBookList';
import { useCharacterPortrait } from '@/hooks/useCharacterPortrait';
import { Mascot, type MascotExpression } from '@/components/mascot/Mascot';
import type {
  BookBucket,
  BookFormat,
  BookPlot,
  BookSize,
  BookType,
} from '@/types/book.types';

interface NewBookWizardProps {
  onClose: () => void;
}

interface WizardCharacter {
  localId: string;
  name: string;
  lookDescription: string;
  anchorImageUrl: string | null;
  anchorPrompt: string | null;
  generating: boolean;
  error: string | null;
}

interface WizardState {
  type: BookType | null;
  bucket: BookBucket | null;
  format: BookFormat | null;
  size: BookSize | null;
  pageLimit: number | null;
  font: string | null;
  themeColor: string | null;
  title: string;
  author: string;
  characters: WizardCharacter[];
  plot: BookPlot;
}

const FORMAT_OPTIONS: Array<{
  value: BookFormat;
  label: string;
  emoji: string;
  description: string;
}> = [
  { value: 'text', label: 'Text only', emoji: '📝', description: 'Just your words' },
  { value: 'image', label: 'Image only', emoji: '🖼', description: 'Just pictures' },
  {
    value: 'text_image',
    label: 'Text + Image',
    emoji: '📖',
    description: 'Words and pictures together',
  },
];

interface StepTheme {
  id: number;
  icon: string;
  label: string;
  heading: string;
  prompt: string;
  /** Tailwind gradient classes for the panel background */
  panelGradient: string;
  /** Tailwind classes for the active step pill */
  pillBg: string;
  /** Mascot expression to show on this step */
  mascotExpression: MascotExpression;
  /** Decorative scene emoji shown in the panel corner */
  sceneEmoji: string;
}

const STEP_THEMES: StepTheme[] = [
  {
    id: 1,
    icon: '💡',
    label: 'Idea',
    heading: 'What kind of book?',
    prompt: 'Pick the one that feels most like you today.',
    panelGradient: 'from-indigo-50 via-white to-purple-50',
    pillBg: 'bg-indigo-500',
    mascotExpression: 'thinking',
    sceneEmoji: '🌟',
  },
  {
    id: 2,
    icon: '🎨',
    label: 'Look',
    heading: 'How will it look?',
    prompt: 'Just words, just pictures, or both together?',
    panelGradient: 'from-orange-50 via-white to-amber-50',
    pillBg: 'bg-orange-500',
    mascotExpression: 'painting',
    sceneEmoji: '🌈',
  },
  {
    id: 3,
    icon: '📏',
    label: 'Size',
    heading: 'Pick a size',
    prompt: 'This one locks in — the rest you can change later.',
    panelGradient: 'from-teal-50 via-white to-emerald-50',
    pillBg: 'bg-teal-500',
    mascotExpression: 'happy',
    sceneEmoji: '📐',
  },
  {
    id: 4,
    icon: '📚',
    label: 'Length',
    heading: 'How many pages?',
    prompt: 'Start small — you can always make another book!',
    panelGradient: 'from-pink-50 via-white to-rose-50',
    pillBg: 'bg-pink-500',
    mascotExpression: 'happy',
    sceneEmoji: '📚',
  },
  {
    id: 5,
    icon: '✍️',
    label: 'Font',
    heading: 'Pick a font',
    prompt: 'You can change it on each page later.',
    panelGradient: 'from-amber-50 via-white to-yellow-50',
    pillBg: 'bg-amber-500',
    mascotExpression: 'happy',
    sceneEmoji: '✨',
  },
  {
    id: 6,
    icon: '🦄',
    label: 'Cast',
    heading: "Who's in your book?",
    prompt: 'Up to 3 friends. They show up the same on every page.',
    panelGradient: 'from-purple-50 via-white to-fuchsia-50',
    pillBg: 'bg-purple-500',
    mascotExpression: 'celebrating',
    sceneEmoji: '🦄',
  },
  {
    id: 7,
    icon: '📖',
    label: 'Plan',
    heading: 'Plan your story',
    prompt: 'Just a sentence per part. Keeps you on track when you write.',
    panelGradient: 'from-sky-50 via-white to-blue-50',
    pillBg: 'bg-sky-500',
    mascotExpression: 'thinking',
    sceneEmoji: '🗺️',
  },
];

const CHARACTER_BUCKETS: ReadonlySet<BookBucket> = new Set(['narrative', 'visual']);
const PLOT_BUCKETS: ReadonlySet<BookBucket> = new Set(['narrative']);

function bucketWantsCharacters(bucket: BookBucket | null): boolean {
  return bucket !== null && CHARACTER_BUCKETS.has(bucket);
}

function bucketWantsPlot(bucket: BookBucket | null): boolean {
  return bucket !== null && PLOT_BUCKETS.has(bucket);
}

function emptyPlot(): BookPlot {
  return { idea: '', beginning: '', problem: '', adventure: '', ending: '' };
}

export function NewBookWizard({ onClose }: NewBookWizardProps) {
  const router = useRouter();
  const { createBook, creating, createError } = useBookList();
  const portrait = useCharacterPortrait();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    type: null,
    bucket: null,
    format: null,
    size: null,
    pageLimit: null,
    font: null,
    themeColor: null,
    title: '',
    author: '',
    characters: [],
    plot: emptyPlot(),
  });

  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));
  const updatePlot = (patch: Partial<BookPlot>) =>
    setState((s) => ({ ...s, plot: { ...s.plot, ...patch } }));

  // Compute total steps based on bucket
  const totalSteps =
    5 +
    (bucketWantsCharacters(state.bucket) ? 1 : 0) +
    (bucketWantsPlot(state.bucket) ? 1 : 0);

  const next = () => setStep((s) => (s < totalSteps ? s + 1 : s));
  const prev = () => setStep((s) => (s > 1 ? s - 1 : s));

  const canProceed =
    (step === 1 && state.type !== null) ||
    (step === 2 && state.format !== null) ||
    (step === 3 && state.size !== null) ||
    (step === 4 && state.pageLimit !== null) ||
    (step === 5 && state.font !== null) ||
    step === 6 ||
    step === 7;

  const isFinalStep = step === totalSteps;
  const theme = STEP_THEMES[step - 1] ?? STEP_THEMES[0]!;

  // Character actions
  const addCharacter = () => {
    if (state.characters.length >= 3) return;
    update({
      characters: [
        ...state.characters,
        {
          localId: nanoid(8),
          name: '',
          lookDescription: '',
          anchorImageUrl: null,
          anchorPrompt: null,
          generating: false,
          error: null,
        },
      ],
    });
  };

  const updateCharacter = (localId: string, patch: Partial<WizardCharacter>) => {
    update({
      characters: state.characters.map((c) =>
        c.localId === localId ? { ...c, ...patch } : c
      ),
    });
  };

  const removeCharacter = (localId: string) => {
    update({ characters: state.characters.filter((c) => c.localId !== localId) });
  };

  const generateCharacterPortrait = async (localId: string) => {
    const c = state.characters.find((x) => x.localId === localId);
    if (!c || !c.lookDescription.trim() || c.generating) return;
    updateCharacter(localId, { generating: true, error: null });
    const result = await portrait.generate({
      lookDescription: c.lookDescription,
    });
    if (result) {
      updateCharacter(localId, {
        anchorImageUrl: result.imageUrl,
        anchorPrompt: result.prompt,
        generating: false,
      });
    } else {
      updateCharacter(localId, {
        generating: false,
        error: portrait.error ?? 'Could not draw — try a different description',
      });
    }
  };

  const handleFinish = async () => {
    if (
      !state.type ||
      !state.bucket ||
      !state.format ||
      !state.size ||
      state.pageLimit === null ||
      !state.font
    ) {
      return;
    }

    const fontOption = BOOK_FONTS.find((f) => f.id === state.font);
    const titleFont = fontOption?.name ?? 'Quicksand';

    const validCharacters = state.characters
      .filter((c) => c.name.trim().length > 0 && c.lookDescription.trim().length >= 5)
      .map((c) => ({
        name: c.name.trim(),
        lookDescription: c.lookDescription.trim(),
        anchorImageUrl: c.anchorImageUrl,
        anchorPrompt: c.anchorPrompt,
      }));

    const plotIsNonEmpty =
      state.plot.idea.trim() ||
      state.plot.beginning.trim() ||
      state.plot.problem.trim() ||
      state.plot.adventure.trim() ||
      state.plot.ending.trim();

    const book = await createBook({
      title: state.title.trim() || 'Untitled book',
      author: state.author.trim() || 'Anonymous Author',
      type: state.type,
      bucket: state.bucket,
      format: state.format,
      size: state.size,
      pageLimit: state.pageLimit,
      typography: {
        titleFont,
        bodyFont: titleFont,
        baseFontSize: 16,
      },
      themeColor: state.themeColor ?? undefined,
      characters: validCharacters.length > 0 ? validCharacters : undefined,
      plot:
        plotIsNonEmpty && bucketWantsPlot(state.bucket)
          ? {
              idea: state.plot.idea.trim(),
              beginning: state.plot.beginning.trim(),
              problem: state.plot.problem.trim(),
              adventure: state.plot.adventure.trim(),
              ending: state.plot.ending.trim(),
            }
          : undefined,
    });

    if (book) {
      router.push(`/create/book/${book.id}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className={`relative w-full max-w-3xl overflow-hidden rounded-t-3xl bg-gradient-to-br ${theme.panelGradient} p-6 shadow-elevated transition-all duration-500 sm:rounded-3xl`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-1.5 text-gray-500 backdrop-blur hover:bg-white hover:text-gray-700"
          aria-label="Close wizard"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Decorative scene */}
        <div className="pointer-events-none absolute right-10 top-10 select-none text-5xl opacity-30">
          {theme.sceneEmoji}
        </div>
        <div className="pointer-events-none absolute -left-2 top-20 select-none text-yellow-300 opacity-50">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="pointer-events-none absolute right-32 top-24 select-none text-pink-300 opacity-40">
          <Sparkles className="h-4 w-4" />
        </div>

        {/* Step timeline */}
        <div className="mb-5 flex items-center justify-center gap-1.5 sm:gap-2">
          {STEP_THEMES.slice(0, totalSteps).map((meta) => {
            const isActive = meta.id === step;
            const isDone = meta.id < step;
            return (
              <div key={meta.id} className="flex items-center gap-1 sm:gap-2">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base shadow-sm transition-all ${
                    isActive
                      ? `scale-110 ${meta.pillBg} text-white`
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/70 text-gray-400'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={meta.label}
                  title={meta.label}
                >
                  {isDone ? <Check className="h-4 w-4" /> : meta.icon}
                </div>
                {meta.id < totalSteps && (
                  <div
                    className={`h-0.5 w-2 sm:w-5 rounded-full ${
                      isDone ? 'bg-emerald-300' : 'bg-white/60'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Heading + mascot */}
        <div className="mb-4 flex items-start gap-3">
          <div className="flex-1">
            <h2
              id="wizard-title"
              className="font-display text-2xl font-bold text-gray-900 sm:text-3xl"
            >
              {theme.heading}
            </h2>
            <p className="mt-1 text-sm text-gray-600">{theme.prompt}</p>
          </div>
          <div className="hidden sm:block">
            <Mascot expression={theme.mascotExpression} size="sm" bobbing />
          </div>
        </div>

        {/* Step body */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="max-h-[55vh] overflow-y-auto"
          >
            {step === 1 && <Step1Type state={state} update={update} />}
            {step === 2 && <Step2Format state={state} update={update} />}
            {step === 3 && <Step3Size state={state} update={update} />}
            {step === 4 && <Step4Pages state={state} update={update} />}
            {step === 5 && <Step5Font state={state} update={update} />}
            {step === 6 && bucketWantsCharacters(state.bucket) && (
              <Step6Characters
                state={state}
                addCharacter={addCharacter}
                updateCharacter={updateCharacter}
                removeCharacter={removeCharacter}
                generatePortrait={generateCharacterPortrait}
              />
            )}
            {step === 7 && bucketWantsPlot(state.bucket) && (
              <Step7Plot plot={state.plot} updatePlot={updatePlot} />
            )}
          </motion.div>
        </AnimatePresence>

        {createError && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {createError}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={step === 1}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-white/60 disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {!isFinalStep ? (
            <button
              type="button"
              onClick={next}
              disabled={!canProceed}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-button transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!canProceed || creating}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-button transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Sparkles className="h-4 w-4" />
              {creating ? 'Creating…' : 'Start writing →'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface StepProps {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}

function Step1Type({ state, update }: StepProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {BOOK_TYPE_CARDS.map((card) => {
        const selected = state.type === card.type;
        return (
          <button
            key={card.type}
            type="button"
            onClick={() =>
              update({
                type: card.type,
                bucket: card.bucket,
                format: state.format ?? card.defaultFormat,
                themeColor: card.suggestedThemeColor,
              })
            }
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center transition-all ${
              selected
                ? 'border-brand-purple bg-white shadow-card scale-[1.02]'
                : 'border-white bg-white/70 hover:border-gray-300 hover:bg-white'
            }`}
          >
            <span className="text-3xl">{card.emoji}</span>
            <span className="text-xs font-semibold text-gray-900">{card.label}</span>
            {selected && (
              <span className="line-clamp-2 text-[10px] text-gray-500">
                {card.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Step2Format({ state, update }: StepProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {FORMAT_OPTIONS.map((opt) => {
        const selected = state.format === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => update({ format: opt.value })}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-5 text-center transition-all ${
              selected
                ? 'border-orange-500 bg-white shadow-card scale-[1.02]'
                : 'border-white bg-white/70 hover:border-gray-300 hover:bg-white'
            }`}
          >
            <span className="text-4xl">{opt.emoji}</span>
            <span className="mt-1 text-sm font-bold text-gray-900">{opt.label}</span>
            <span className="text-xs text-gray-600">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}

function Step3Size({ state, update }: StepProps) {
  const sizes = Object.entries(BOOK_SIZES) as Array<
    [BookSize, (typeof BOOK_SIZES)[BookSize]]
  >;
  return (
    <div className="space-y-2">
      <p className="rounded-xl bg-amber-100/80 p-3 text-xs font-medium text-amber-900">
        💡 Size locks in here — you can change everything else later, but not the size.
      </p>
      {sizes.map(([key, size]) => {
        const selected = state.size === key;
        const aspectRatio = size.widthMm / size.heightMm;
        return (
          <button
            key={key}
            type="button"
            onClick={() => update({ size: key })}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 transition-all ${
              selected
                ? 'border-teal-500 bg-white shadow-card'
                : 'border-white bg-white/70 hover:border-gray-300 hover:bg-white'
            }`}
          >
            <div
              className="rounded border-2 border-teal-300 bg-teal-50"
              style={{
                width: aspectRatio < 1 ? 32 : 40,
                height: aspectRatio < 1 ? 40 : aspectRatio === 1 ? 32 : 30,
              }}
            />
            <div className="flex-1 text-left">
              <div className="text-sm font-bold text-gray-900">{size.label}</div>
              <div className="text-xs text-gray-600">{size.description}</div>
            </div>
            {selected && <Check className="h-5 w-5 text-teal-600" />}
          </button>
        );
      })}
    </div>
  );
}

function Step4Pages({ state, update }: StepProps) {
  return (
    <div className="space-y-2">
      {BOOK_KIT_PRESETS.map((kit) => {
        const selected = state.pageLimit === kit.pageLimit;
        const isFreeTierAllowed = kit.pageLimit <= FREE_TIER_PAGE_LIMIT;
        return (
          <button
            key={kit.label}
            type="button"
            onClick={() => isFreeTierAllowed && update({ pageLimit: kit.pageLimit })}
            disabled={!isFreeTierAllowed}
            className={`flex w-full items-center justify-between rounded-2xl border-2 p-3 text-left transition-all ${
              selected
                ? 'border-pink-500 bg-white shadow-card'
                : 'border-white bg-white/70 hover:border-gray-300 hover:bg-white'
            } ${!isFreeTierAllowed ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-gray-900">{kit.label}</div>
                {kit.recommended && (
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    ⭐ Pick of the day
                  </span>
                )}
                {!isFreeTierAllowed && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                    🔒 Pro
                  </span>
                )}
              </div>
              {kit.description && (
                <div className="mt-0.5 text-xs text-gray-600">{kit.description}</div>
              )}
            </div>
            {selected && <Check className="h-5 w-5 text-pink-500" />}
          </button>
        );
      })}
      <p className="px-1 pt-1 text-[11px] text-gray-500">
        Free: 5-page mini book. Longer books unlock with Pro.
      </p>
    </div>
  );
}

function Step5Font({ state, update }: StepProps) {
  return (
    <div className="space-y-2">
      {BOOK_FONTS.map((font) => {
        const selected = state.font === font.id;
        return (
          <button
            key={font.id}
            type="button"
            onClick={() => update({ font: font.id })}
            className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-3 text-left transition-all ${
              selected
                ? 'border-amber-500 bg-white shadow-card'
                : 'border-white bg-white/70 hover:border-gray-300 hover:bg-white'
            }`}
          >
            <div className="flex-1">
              <div className="text-base font-bold text-gray-900">{font.name}</div>
              <div className="text-xs text-gray-600">{font.vibe}</div>
            </div>
            {selected && <Check className="h-5 w-5 text-amber-500" />}
          </button>
        );
      })}
    </div>
  );
}

interface Step6Props {
  state: WizardState;
  addCharacter: () => void;
  updateCharacter: (localId: string, patch: Partial<WizardCharacter>) => void;
  removeCharacter: (localId: string) => void;
  generatePortrait: (localId: string) => Promise<void>;
}

function Step6Characters({
  state,
  addCharacter,
  updateCharacter,
  removeCharacter,
  generatePortrait,
}: Step6Props) {
  const remaining = 3 - state.characters.length;

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-purple-100/80 p-3 text-xs font-medium text-purple-900">
        ✨ Up to <strong>3 friends</strong>. They&apos;ll show up the same way on every page —
        same face, same clothes. Skip if you don&apos;t have characters yet.
      </p>

      {state.characters.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-purple-300 bg-white/60 p-6 text-center">
          <div className="text-4xl">🦄</div>
          <p className="mt-2 text-sm font-bold text-gray-900">No friends yet</p>
          <p className="mt-1 text-xs text-gray-600">Tap below to add your first one</p>
        </div>
      )}

      {state.characters.map((c, i) => (
        <CharacterCardEditor
          key={c.localId}
          character={c}
          index={i}
          onUpdate={(patch) => updateCharacter(c.localId, patch)}
          onRemove={() => removeCharacter(c.localId)}
          onGenerate={() => generatePortrait(c.localId)}
        />
      ))}

      {remaining > 0 && (
        <button
          type="button"
          onClick={addCharacter}
          className="w-full rounded-2xl border-2 border-dashed border-purple-400 bg-purple-50/70 px-3 py-3 text-sm font-bold text-purple-700 transition-colors hover:bg-purple-100"
        >
          + Add a friend{state.characters.length > 0 ? ` (${remaining} left)` : ''}
        </button>
      )}
    </div>
  );
}

interface CharacterCardEditorProps {
  character: WizardCharacter;
  index: number;
  onUpdate: (patch: Partial<WizardCharacter>) => void;
  onRemove: () => void;
  onGenerate: () => void;
}

function CharacterCardEditor({
  character,
  index,
  onUpdate,
  onRemove,
  onGenerate,
}: CharacterCardEditorProps) {
  const canGenerate =
    character.lookDescription.trim().length >= 5 && !character.generating;

  return (
    <div className="rounded-2xl border-2 border-white bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100"
          aria-label={`Portrait of ${character.name || `friend ${index + 1}`}`}
        >
          {character.anchorImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.anchorImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              {character.generating ? '✨' : '🦄'}
            </div>
          )}
          {character.generating && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <span className="text-xs font-bold text-purple-600">Drawing…</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              value={character.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              maxLength={40}
              placeholder={`Friend ${index + 1} name`}
              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Remove friend"
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={character.lookDescription}
            onChange={(e) => onUpdate({ lookDescription: e.target.value })}
            maxLength={300}
            rows={2}
            placeholder="What do they look like? curly hair, yellow kurta, blue eyes…"
            className="w-full resize-none rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-bold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" />
            {character.generating
              ? 'Drawing…'
              : character.anchorImageUrl
                ? 'Try again'
                : '✨ Imagine!'}
          </button>
          {character.error && (
            <p className="text-[11px] text-red-600">{character.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 7 — Plan your story ────────────────────────────────────────────

interface Step7Props {
  plot: BookPlot;
  updatePlot: (patch: Partial<BookPlot>) => void;
}

interface BeatMeta {
  key: keyof BookPlot;
  emoji: string;
  label: string;
  prompt: string;
  placeholder: string;
  ideaChips: string[];
}

const PLOT_BEATS: BeatMeta[] = [
  {
    key: 'idea',
    emoji: '💡',
    label: 'The Big Idea',
    prompt: 'What is your story about?',
    placeholder: 'A brave kid who…',
    ideaChips: [
      'A brave kid who…',
      'A magical place where…',
      'Two best friends who…',
      'A talking animal who…',
    ],
  },
  {
    key: 'beginning',
    emoji: '🌟',
    label: 'The Beginning',
    prompt: 'How does it start?',
    placeholder: 'It was a sunny morning when…',
    ideaChips: [
      'It was a sunny morning when…',
      'Once upon a time…',
      'On the way to school…',
      'Last summer at Nani’s…',
    ],
  },
  {
    key: 'problem',
    emoji: '⚡',
    label: 'The Problem',
    prompt: 'What goes wrong?',
    placeholder: 'Suddenly…',
    ideaChips: [
      'Suddenly…',
      '…went missing!',
      'But then…',
      'Out of nowhere…',
    ],
  },
  {
    key: 'adventure',
    emoji: '🚀',
    label: 'The Adventure',
    prompt: 'What happens next?',
    placeholder: 'They had to figure out…',
    ideaChips: [
      'They had to figure out…',
      'With their friends…',
      'The journey took them…',
      'Bravely, they…',
    ],
  },
  {
    key: 'ending',
    emoji: '🎉',
    label: 'The Ending',
    prompt: 'How does it end?',
    placeholder: 'And that’s how…',
    ideaChips: [
      'And that’s how…',
      'From that day on…',
      'They learned that…',
      'Everyone smiled because…',
    ],
  },
];

function Step7Plot({ plot, updatePlot }: Step7Props) {
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-sky-100/80 p-3 text-xs font-medium text-sky-900">
        🗺️ A quick plan keeps you on track when you write. Skip any part you&apos;re not
        sure about — you can always come back to it.
      </p>

      {PLOT_BEATS.map((beat) => (
        <BeatField
          key={beat.key}
          beat={beat}
          value={plot[beat.key]}
          onChange={(value) => updatePlot({ [beat.key]: value } as Partial<BookPlot>)}
        />
      ))}
    </div>
  );
}

interface BeatFieldProps {
  beat: BeatMeta;
  value: string;
  onChange: (next: string) => void;
}

function BeatField({ beat, value, onChange }: BeatFieldProps) {
  const isFilled = value.trim().length > 0;
  return (
    <div
      className={`rounded-2xl border-2 p-3 transition-all ${
        isFilled ? 'border-sky-300 bg-white shadow-sm' : 'border-white bg-white/80'
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xl">{beat.emoji}</span>
        <div className="flex-1">
          <div className="text-sm font-bold text-gray-900">{beat.label}</div>
          <div className="text-[11px] text-gray-600">{beat.prompt}</div>
        </div>
        {isFilled && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            ✓
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder={beat.placeholder}
        className="w-full resize-none rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      {!isFilled && beat.ideaChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {beat.ideaChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChange(chip)}
              className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200 transition-colors hover:bg-sky-100"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
