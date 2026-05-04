'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import {
  BOOK_FONTS,
  BOOK_KIT_PRESETS,
  BOOK_SIZES,
  BOOK_TYPE_CARDS,
  FREE_TIER_PAGE_LIMIT,
} from '@/lib/templates/bookTemplates';
import { useBookList } from '@/hooks/useBookList';
import type {
  BookBucket,
  BookFormat,
  BookSize,
  BookType,
} from '@/types/book.types';

interface NewBookWizardProps {
  onClose: () => void;
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

export function NewBookWizard({ onClose }: NewBookWizardProps) {
  const router = useRouter();
  const { createBook, creating, createError } = useBookList();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
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
  });

  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));

  const next = () => setStep((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : s));
  const prev = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : s));

  const canProceed =
    (step === 1 && state.type !== null) ||
    (step === 2 && state.format !== null) ||
    (step === 3 && state.size !== null) ||
    (step === 4 && state.pageLimit !== null) ||
    (step === 5 && state.font !== null);

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
        className="relative w-full max-w-2xl rounded-t-3xl bg-white p-6 shadow-elevated sm:rounded-3xl"
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close wizard"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  n <= step ? 'bg-brand-purple' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">Step {step} of 5</div>
        </div>

        <h2 id="wizard-title" className="text-xl font-bold text-gray-900">
          {step === 1 && 'What kind of book?'}
          {step === 2 && 'How will it look?'}
          {step === 3 && 'What size?'}
          {step === 4 && 'How long?'}
          {step === 5 && 'Pick a font'}
        </h2>

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

          {step < 5 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canProceed}
              className="flex items-center gap-1.5 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-brand-purple/90 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!canProceed || creating}
              className="flex items-center gap-1.5 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-brand-purple/90 disabled:opacity-50"
            >
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
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
              selected
                ? 'border-brand-purple bg-brand-purple/5 shadow-card'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className="text-2xl">{card.emoji}</span>
            <span className="text-xs font-semibold text-gray-900">{card.label}</span>
            {selected && (
              <span className="text-[10px] text-gray-500 line-clamp-2">
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
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 text-center transition-all ${
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
      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
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
            className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 transition-all ${
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
            className={`flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition-all ${
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
            className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 p-3 text-left transition-all ${
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
