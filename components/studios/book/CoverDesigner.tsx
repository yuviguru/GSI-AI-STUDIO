'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import type { BookSize } from '@/types/book.types';
import { BOOK_SIZES } from '@/lib/templates/bookTemplates';
import { useBook } from '@/hooks/useBook';
import { usePageImage } from '@/hooks/usePageImage';

function aspectForSize(size: BookSize): 'square' | 'portrait' | 'landscape' {
  if (size === 'square') return 'square';
  if (size === 'landscape') return 'landscape';
  return 'portrait';
}

interface CoverDesignerProps {
  bookId: string;
  onClose: () => void;
}

const COLOR_PALETTE = [
  '#5B5FFF',
  '#8A5CFF',
  '#FF9F43',
  '#20C997',
  '#FF6B9D',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#1F2937',
];

export function CoverDesigner({ bookId, onClose }: CoverDesignerProps) {
  const { book, updateCover, actionLoading } = useBook(bookId);
  const { generate, loading: generatingImage } = usePageImage();

  const [title, setTitle] = useState(book?.cover.title ?? '');
  const [subtitle, setSubtitle] = useState(book?.cover.subtitle ?? '');
  const [authorName, setAuthorName] = useState(book?.cover.authorName ?? '');
  const [backgroundColor, setBackgroundColor] = useState(
    book?.cover.backgroundColor ?? '#5B5FFF'
  );
  const [imagePrompt, setImagePrompt] = useState(book?.cover.imagePrompt ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(book?.cover.imageUrl ?? null);

  if (!book) return null;
  const dims = BOOK_SIZES[book.size];
  const aspectRatio = dims.widthMm / dims.heightMm;

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    const result = await generate({
      prompt: imagePrompt,
      aspect: aspectForSize(book.size),
      bookId,
    });
    if (result) {
      setImageUrl(result.imageUrl);
    }
  };

  const handleSave = async () => {
    await updateCover({
      title,
      subtitle,
      authorName,
      backgroundColor,
      imageUrl: imageUrl ?? null,
      imagePrompt: imagePrompt.trim() || null,
      font: book.cover.font,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative grid w-full max-w-3xl gap-4 rounded-3xl bg-white p-5 shadow-elevated sm:grid-cols-2"
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100"
          aria-label="Close cover designer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Live preview */}
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Cover preview
          </div>
          <div
            className="relative mx-auto w-full max-w-xs overflow-hidden rounded-xl shadow-elevated"
            style={{ aspectRatio: `${aspectRatio}`, backgroundColor }}
          >
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* Gradient backdrop for text legibility */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/40 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-7xl">📖</div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-4 text-center text-white">
              <h1
                className="font-display text-xl font-bold leading-tight drop-shadow-md"
                style={{ fontFamily: book.cover.font }}
              >
                {title || 'Your title'}
              </h1>
              {subtitle && <p className="mt-1 text-xs opacity-90 drop-shadow">{subtitle}</p>}
              <p className="mt-2 text-xs drop-shadow">By {authorName || 'You'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-gray-900">Design your cover</h2>

          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="My Goa Trip"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
            />
          </Field>

          <Field label="Subtitle (optional)">
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={150}
              placeholder="A summer adventure"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
            />
          </Field>

          <Field label="Author">
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={60}
              placeholder="Aanya"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
            />
          </Field>

          <Field label="Background colour">
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBackgroundColor(c)}
                  className={`h-7 w-7 rounded-full transition-all ${
                    backgroundColor === c
                      ? 'ring-2 ring-gray-900 ring-offset-2'
                      : 'ring-1 ring-gray-200'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Background ${c}`}
                />
              ))}
            </div>
          </Field>

          <Field label="Cover image (optional)">
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="A sunny beach with palm trees, watercolor style"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
            />
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={!imagePrompt.trim() || generatingImage}
              className="mt-1 flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generatingImage ? 'Generating…' : 'Generate cover image'}
            </button>
          </Field>

          <div className="mt-auto flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={actionLoading}
              className="flex-1 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-brand-purple/90 disabled:opacity-50"
            >
              {actionLoading ? 'Saving…' : 'Save cover'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
