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
import { Mascot } from '@/components/mascot/Mascot';
import type {
  BookBucket,
  BookFormat,
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

/** Step metadata — used by the progress timeline + heading. */
const STEP_META: Array<{
  id: number;
  icon: string;
  label: string;
  heading: string;
}> = [
  { id: 1, icon: '💡', label: 'Type', heading: 'What kind of book?' },
  { id: 2, icon: '🎨', label: 'Format', heading: 'How will it look?' },
  { id: 3, icon: '📏', label: 'Size', heading: 'What size?' },
  { id: 4, icon: '📚', label: 'Pages', heading: 'How long?' },
  { id: 5, icon: '✍️', label: 'Font', heading: 'Pick a font' },
  { id: 6, icon: '🦄', label: 'Cast', heading: "Who's in your book?" },
];

/** Buckets that have a character setup step. */
const CHARACTER_BUCKETS: ReadonlySet<BookBucket> = new Set(['narrative', 'visual']);

function bucketWantsCharacters(bucket: BookBucket | null): boolean {
  return bucket !== null && CHARACTER_BUCKETS.has(bucket);
}

export function NewBookWizard({ onClose }: NewBookWizardProps) {
  const router = useRouter();
  const { createBook, creating, createError } = useBookList();
  const portrait = useCharacterPortrait();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
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
  });

  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));

  const totalSteps = bucketWantsCharacters(state.bucket) ? 6 : 5;

  const next = () =>
    setStep((s) => (s < totalSteps ? ((s + 1) as 1 | 2 | 3 | 4 | 5 | 6) : s));
  const prev = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5 | 6) : s));

  const canProceed =
    (step === 1 && state.type !== null) ||
    (step === 2 && state.format !== null) ||
    (step === 3 && state.size !== null) ||
    (step === 4 && state.pageLimit !== null) ||
    (step === 5 && state.font !== null) ||
    step === 6;

  const isFinalStep = step === totalSteps;

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

    // Filter out characters with no name/look (slots left blank)
    const validCharacters = state.characters
      .filter((c) => c.name.trim().length > 0 && c.lookDescription.trim().length >= 5)
      .map((c) => ({
        name: c.name.trim(),
        lookDescription: c.lookDescription.trim(),
        anchorImageUrl: c.anchorImageUrl,
        anchorPrompt: c.anchorPrompt,
      }));

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
    });

    if (book) {
      router.push(`/create/book/${book.id}`);
    }
  };

  const stepMeta = STEP_META.find((s) => s.id === step) ?? STEP_META[0]!;

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
        className="relative w-full max-w-3xl overflow-hidden rounded-t-3xl bg-gradient-to-b from-indigo-50/70 via-white to-white p-6 shadow-elevated sm:rounded-3xl"
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

        {/* Decorative sparkles */}
        <div className="pointer-events-none absolute -left-4 -top-2 select-none text-yellow-300 opacity-50">
          <Sparkles className="h-8 w-8" />
        </div>
        <div className="pointer-events-none absolute right-16 top-12 select-none text-indigo-300 opacity-40">
          <Sparkles className="h-5 w-5" />
        </div>

        {/* Step timeline */}
        <div className="mb-4 flex items-center justify-center gap-2 sm:gap-3">
          {STEP_META.slice(0, totalSteps).map((meta) => {
            const isActive = meta.id === step;
            const isDone = meta.id < step;
            return (
              <div key={meta.id} className="flex items-center gap-1 sm:gap-2">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base shadow-sm transition-all ${
                    isActive
                      ? 'scale-110 bg-brand-purple text-white'
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={meta.label}
                >
                  {isDone ? <Check className="h-4 w-4" /> : meta.icon}
                </div>
                {meta.id < totalSteps && (
                  <div
                    className={`h-0.5 w-3 sm:w-6 rounded-full ${
                      isDone ? 'bg-emerald-300' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Heading */}
        <div className="mb-2 flex items-start gap-3">
          <div className="flex-1">
            <h2
              id="wizard-title"
              className="font-display text-2xl font-bold text-gray-900 sm:text-3xl"
            >
              {stepMeta.heading}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Step {step} of {totalSteps}
            </p>
          </div>
          <div className="hidden sm:block">
            <Mascot expression={step === totalSteps ? 'celebrating' : 'happy'} size="sm" />
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
            className="mt-4 max-h-[55vh] overflow-y-auto"
          >
            {step === 1 && <Step1Type state={state} update={update} />}
            {step === 2 && <Step2Format state={state} update={update} />}
            {step === 3 && <Step3Size state={state} update={update} />}
            {step === 4 && <Step4Pages state={state} update={update} />}
            {step === 5 && <Step5Font state={state} update={update} />}
            {step === 6 && (
              <Step6Characters
                state={state}
                addCharacter={addCharacter}
                updateCharacter={updateCharacter}
                removeCharacter={removeCharacter}
                generatePortrait={generateCharacterPortrait}
              />
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
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30"
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
                ? 'border-brand-purple bg-brand-purple/5 shadow-card'
                : 'border-gray-200 bg-white hover:border-gray-300'
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
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center transition-all ${
              selected
                ? 'border-brand-purple bg-brand-purple/5 shadow-card'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className="text-3xl">{opt.emoji}</span>
            <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
            <span className="text-xs text-gray-500">{opt.description}</span>
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
      <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
        💡 Size locks in now — you can change everything else later, but not the size.
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
                ? 'border-brand-purple bg-brand-purple/5'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div
              className="rounded border border-gray-300 bg-gray-100"
              style={{
                width: aspectRatio < 1 ? 28 : 36,
                height: aspectRatio < 1 ? 36 : aspectRatio === 1 ? 28 : 28,
              }}
            />
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-900">{size.label}</div>
              <div className="text-xs text-gray-500">{size.description}</div>
            </div>
            {selected && <Check className="h-5 w-5 text-brand-purple" />}
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
                ? 'border-brand-purple bg-brand-purple/5'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${!isFreeTierAllowed ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-gray-900">{kit.label}</div>
                {kit.recommended && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    Recommended
                  </span>
                )}
                {!isFreeTierAllowed && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    Pro
                  </span>
                )}
              </div>
              {kit.description && (
                <div className="mt-0.5 text-xs text-gray-500">{kit.description}</div>
              )}
            </div>
            {selected && <Check className="h-5 w-5 text-brand-purple" />}
          </button>
        );
      })}
      <p className="px-1 pt-1 text-[11px] text-gray-500">
        Free tier: 5-page mini book. Longer books unlock with Pro.
      </p>
    </div>
  );
}

function Step5Font({ state, update }: StepProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">
        Pick the default font — you can change individual pages later.
      </p>
      {BOOK_FONTS.map((font) => {
        const selected = state.font === font.id;
        return (
          <button
            key={font.id}
            type="button"
            onClick={() => update({ font: font.id })}
            className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-3 text-left transition-all ${
              selected
                ? 'border-brand-purple bg-brand-purple/5'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex-1">
              <div className="text-base font-semibold text-gray-900">{font.name}</div>
              <div className="text-xs text-gray-500">{font.vibe}</div>
            </div>
            {selected && <Check className="h-5 w-5 text-brand-purple" />}
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

const SAMPLE_CHARACTERS: Array<{ name: string; look: string }> = [
  {
    name: 'Aanya',
    look: '10yr girl, curly black hair, yellow kurta, red sneakers, brown eyes',
  },
  { name: 'Miko', look: 'small grey tabby cat, green collar with silver bell, white chest tuft' },
  { name: 'Rohan', look: '8yr boy, short hair, blue cap, striped t-shirt, scuffed white shoes' },
  { name: 'Zara', look: 'friendly dragon, teal scales, tiny wings, big amber eyes, smiling' },
];

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
      <p className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900">
        ✨ Make up to <strong>3 characters</strong>. They&apos;ll show up the same way on every
        page — same face, same clothes. Skip this step if you don&apos;t have characters yet.
      </p>

      {state.characters.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white/60 p-6 text-center">
          <div className="text-3xl">🦄</div>
          <p className="mt-2 text-sm font-semibold text-gray-900">No characters yet</p>
          <p className="mt-1 text-xs text-gray-500">Tap below to add your first one</p>
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
          className="w-full rounded-2xl border-2 border-dashed border-brand-purple/50 bg-brand-purple/5 px-3 py-3 text-sm font-semibold text-brand-purple transition-colors hover:bg-brand-purple/10"
        >
          + Add a character{state.characters.length > 0 ? ` (${remaining} left)` : ''}
        </button>
      )}

      <div className="rounded-xl bg-gray-50 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Need ideas? Try one of these:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_CHARACTERS.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => {
                if (state.characters.length >= 3) return;
                addCharacter();
                // Defer setting fields to next tick so the new char exists in state
                setTimeout(() => {
                  // We can't easily target the latest by index here due to async
                  // setState, so leave the kid to copy/paste. Showing the sample
                  // text is the main affordance.
                }, 0);
              }}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
              title={s.look}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
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
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Anchor portrait or placeholder */}
        <div
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100"
          aria-label={`Portrait of ${character.name || `character ${index + 1}`}`}
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
              <span className="text-xs font-medium text-brand-purple">
                Drawing…
              </span>
            </div>
          )}
        </div>

        {/* Inputs */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              value={character.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              maxLength={40}
              placeholder={`Character ${index + 1} name`}
              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
            />
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Remove character"
              title="Remove character"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={character.lookDescription}
            onChange={(e) => onUpdate({ lookDescription: e.target.value })}
            maxLength={300}
            rows={2}
            placeholder="What do they look like? E.g. curly hair, yellow kurta, blue eyes…"
            className="w-full resize-none rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
          />
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
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
