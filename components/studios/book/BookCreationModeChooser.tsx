'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Pencil, Sparkles, X } from 'lucide-react';

export type BookCreationMode = 'manual' | 'ai';

interface BookCreationModeChooserProps {
  onPick: (mode: BookCreationMode) => void;
  onCancel: () => void;
}

/**
 * BOOK-002 — the friction-reducer.
 *
 * Shown when the kid taps "New Book" or "Start your first book". Two paths:
 *   - Manual: existing NewBookWizard flow (write page by page)
 *   - AI:     new AI generate flow (full draft, then edit)
 *
 * The small print under both cards previews the badge system from
 * BOOK-003 — kids see the trade-off before they choose. This is
 * intentional: it educates early and sets honest expectations.
 */
export function BookCreationModeChooser({ onPick, onCancel }: BookCreationModeChooserProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 24, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-50 via-white to-purple-50 p-6 shadow-card sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-label="Choose how to start your book"
      >
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 text-center">
          <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
            How do you want to start?
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Two ways to make a book — your choice.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Manual */}
          <button
            type="button"
            onClick={() => onPick('manual')}
            className="group relative flex flex-col items-start gap-3 rounded-2xl border-2 border-indigo-200 bg-white p-5 text-left shadow-sm transition-all hover:scale-[1.02] hover:border-indigo-400 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
              <Pencil className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-gray-900">
                Write it myself
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Page by page, your own words. AI only helps with grammar.
              </p>
            </div>
            <div className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
              Start the wizard <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>

          {/* AI */}
          <button
            type="button"
            onClick={() => onPick('ai')}
            className="group relative flex flex-col items-start gap-3 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 text-left shadow-sm transition-all hover:scale-[1.02] hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-gray-900">
                Generate with AI
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Tell me what you want — I'll draft the whole book. You can edit anything after.
              </p>
            </div>
            <div className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
              Set up a draft <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>

        {/* Honesty pill — sets BOOK-003 expectations up front */}
        <div className="mt-5 rounded-xl bg-white/70 px-4 py-3 text-center ring-1 ring-gray-200">
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-700">Heads up:</span>{' '}
            Both paths track who did what. The more you write or rewrite in your own
            words, the higher your badge when you publish — from{' '}
            <span className="font-bold text-sky-600">AI Generated</span> all the way
            to <span className="font-bold text-emerald-600">Pure Imagination</span>.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
