'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Mascot } from '@/components/mascot/Mascot';
import { useBookGenerate } from '@/hooks/useBookGenerate';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { FREE_TIER_PAGE_LIMIT } from '@/lib/templates/bookTemplates';
import type { BookFormat, BookSize, BookType } from '@gsi/types';

type Style = 'funny' | 'brave' | 'silly' | 'scary' | 'sweet' | 'mysterious';

const STYLES: Array<{ value: Style; emoji: string; label: string }> = [
  { value: 'funny', emoji: '😂', label: 'Funny' },
  { value: 'brave', emoji: '🦸', label: 'Brave' },
  { value: 'silly', emoji: '🤪', label: 'Silly' },
  { value: 'sweet', emoji: '💝', label: 'Sweet' },
  { value: 'mysterious', emoji: '🔍', label: 'Mysterious' },
  { value: 'scary', emoji: '👻', label: 'Scary' },
];

const AGES: number[] = [6, 8, 10, 12, 14];

interface AiGenerateBookFormProps {
  onClose: () => void;
}

/**
 * BOOK-002 — the AI-draft form.
 *
 * Single-form path to a full book draft. Kid fills 3 fields (topic, age,
 * style, pages) then waits while Claude + image cascade run. Mascot keeps
 * them company during the ~15-30s generation.
 *
 * After success: redirects to /create/book/[bookId] where the editor
 * shows the prefilled book and the AuthorYourOwn nudge banner kicks in.
 *
 * Defaults to the `storybook` type + `text_image` format + `square` size
 * for v1 — the simplest combo. Future iterations can let the kid pick.
 */
export function AiGenerateBookForm({ onClose }: AiGenerateBookFormProps) {
  const router = useRouter();
  const { generate, loading, error } = useBookGenerate();
  const { trackCreation } = useAiPoints();

  const [topic, setTopic] = useState('');
  const [age, setAge] = useState<number>(8);
  const [style, setStyle] = useState<Style>('funny');
  const [pageCount, setPageCount] = useState<number>(Math.min(5, FREE_TIER_PAGE_LIMIT));

  // Fixed defaults — v1 simplifies the surface. A future story can expose these.
  const type: BookType = 'storybook';
  const format: BookFormat = 'text_image';
  const size: BookSize = 'square';

  const canSubmit = topic.trim().length >= 5 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const result = await generate({
      topic: topic.trim(),
      age,
      style,
      type,
      format,
      size,
      pageCount,
    });
    if (result) {
      await trackCreation('book');
      router.push(result.redirectUrl);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-card sm:p-7">
      <button
        type="button"
        onClick={onClose}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-amber-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-4 flex items-start gap-3">
        <div className="flex-1">
          <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
            Tell me about your book
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            I&apos;ll draft the whole thing — you make it yours after.
          </p>
        </div>
        <div className="hidden sm:block">
          <Mascot expression={loading ? 'thinking' : 'happy'} size="sm" bobbing />
        </div>
      </div>

      <div className="space-y-4">
        {/* Topic */}
        <div>
          <label className="mb-1.5 block text-sm font-bold text-gray-900">
            What&apos;s your book about?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={loading}
            placeholder="A dragon who is afraid of the dark and finds a glowing mushroom friend…"
            className="w-full resize-none rounded-xl border-2 border-amber-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
          />
          <p className="mt-1 text-[11px] text-gray-500">
            {topic.length}/500 chars — short and punchy works best.
          </p>
        </div>

        {/* Age */}
        <div>
          <label className="mb-1.5 block text-sm font-bold text-gray-900">
            Reader age
          </label>
          <div className="flex flex-wrap gap-2">
            {AGES.map((a) => (
              <button
                key={a}
                type="button"
                disabled={loading}
                onClick={() => setAge(a)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
                  age === a
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-amber-50'
                } disabled:opacity-60`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div>
          <label className="mb-1.5 block text-sm font-bold text-gray-900">
            Vibe
          </label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                disabled={loading}
                onClick={() => setStyle(s.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
                  style === s.value
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-amber-50'
                } disabled:opacity-60`}
              >
                <span>{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pages */}
        <div>
          <label className="mb-1.5 block text-sm font-bold text-gray-900">
            How many pages?
          </label>
          <div className="flex flex-wrap gap-2">
            {[3, 5, 7, 10].map((n) => {
              const locked = n > FREE_TIER_PAGE_LIMIT;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={loading || locked}
                  onClick={() => setPageCount(n)}
                  className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
                    pageCount === n
                      ? 'bg-amber-500 text-white shadow-sm'
                      : locked
                        ? 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'
                        : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-amber-50'
                  } disabled:cursor-not-allowed`}
                >
                  {n} pages
                  {locked && <span className="text-[10px]">🔒</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Free plan: up to {FREE_TIER_PAGE_LIMIT} pages.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-white/80 px-3 py-3 text-center ring-1 ring-amber-200"
          >
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Drafting your book… this can take 15–30 seconds
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Writing pages, then drawing pictures. Hang tight!
            </p>
          </motion.div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-button transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? 'Drafting…' : 'Draft my book'}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
