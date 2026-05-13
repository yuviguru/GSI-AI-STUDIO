'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import type { BookCharacter, BookSize } from '@gsi/types';
import { BOOK_SIZES } from '@/lib/templates/bookTemplates';
import { useBook } from '@/hooks/useBook';
import { usePageImage } from '@/hooks/usePageImage';
import { useSceneImage } from '@/hooks/useSceneImage';
import { useSession } from '@/hooks/useSession';

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
  const { book, updateCover, patchBook, actionLoading } = useBook(bookId);
  const pageImage = usePageImage();
  const sceneImage = useSceneImage();
  const { creationsRemaining, cooldownSeconds } = useSession();

  const [title, setTitle] = useState(book?.cover.title ?? '');
  const [subtitle, setSubtitle] = useState(book?.cover.subtitle ?? '');
  const [authorName, setAuthorName] = useState(book?.cover.authorName ?? '');
  const [backgroundColor, setBackgroundColor] = useState(
    book?.cover.backgroundColor ?? '#5B5FFF'
  );
  const [imagePrompt, setImagePrompt] = useState(book?.cover.imagePrompt ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(book?.cover.imageUrl ?? null);
  const [genError, setGenError] = useState<string | null>(null);

  // Back cover content (rendered on the LEFT of the cover spread)
  const [authorBio, setAuthorBio] = useState(book?.backCover?.authorBio ?? '');
  const [bookBlurb, setBookBlurb] = useState(book?.backCover?.text ?? '');
  const [authorPhotoUrl, setAuthorPhotoUrl] = useState<string | null>(
    book?.backCover?.authorPhotoUrl ?? null
  );

  // Default cover characters = all of them (the cover usually shows everyone)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    book?.characters.map((c) => c.id) ?? []
  );

  if (!book) return null;
  const hasCharacters = book.characters.length > 0;
  const dims = BOOK_SIZES[book.size];
  const aspectRatio = dims.widthMm / dims.heightMm;
  const generating = pageImage.loading || sceneImage.loading;

  const toggleCharacter = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGenerateImage = async () => {
    setGenError(null);
    if (!imagePrompt.trim()) return;

    if (hasCharacters) {
      // Character-aware: use scene-image so the cover features the same
      // friends with the same look as every page in the book.
      const result = await sceneImage.generate({
        bookId,
        characterIds: selectedIds,
        action: imagePrompt.trim(),
      });
      if (result) {
        setImageUrl(result.imageUrl);
      } else {
        setGenError(sceneImage.error ?? 'Could not draw the cover — try again');
      }
      return;
    }

    // No characters: fall back to free-prompt page image
    const result = await pageImage.generate({
      prompt: imagePrompt,
      aspect: aspectForSize(book.size),
      bookId,
    });
    if (result) {
      setImageUrl(result.imageUrl);
    } else {
      setGenError(pageImage.error ?? 'Could not draw the cover — try again');
    }
  };

  const handleSave = async () => {
    // Save the front cover via the dedicated endpoint
    await updateCover({
      title,
      subtitle,
      authorName,
      backgroundColor,
      imageUrl: imageUrl ?? null,
      imagePrompt: imagePrompt.trim() || null,
      font: book.cover.font,
    });

    // Save the back cover via the generic book PATCH (bookPatchSchema accepts
    // backCover). Only send if the kid changed something or there's existing
    // back-cover content to preserve.
    const trimmedBio = authorBio.trim();
    const trimmedBlurb = bookBlurb.trim();
    const hasContent = !!trimmedBio || !!trimmedBlurb || !!authorPhotoUrl;
    if (
      hasContent ||
      book.backCover !== null
    ) {
      await patchBook({
        backCover: {
          text: trimmedBlurb,
          imageUrl: book.backCover?.imageUrl ?? null,
          authorBio: trimmedBio || null,
          authorPhotoUrl: authorPhotoUrl,
        },
      });
    }

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
        className="relative grid max-h-[90vh] w-full max-w-3xl gap-4 overflow-y-auto rounded-3xl bg-white p-5 shadow-elevated sm:grid-cols-2"
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

          {hasCharacters && (
            <Field label="Who's on the cover?">
              <div className="flex flex-wrap gap-1.5">
                {book.characters.map((c) => (
                  <CoverCharacterChip
                    key={c.id}
                    character={c}
                    selected={selectedIds.includes(c.id)}
                    onToggle={() => toggleCharacter(c.id)}
                  />
                ))}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">
                Tap to include / leave out. Default = everyone.
              </p>
            </Field>
          )}

          <Field
            label={
              hasCharacters ? "What's happening on the cover?" : 'Cover image (optional)'
            }
          >
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder={
                hasCharacters
                  ? 'all smiling on a picnic blanket in a sunny park'
                  : 'A sunny beach with palm trees, watercolor style'
              }
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
            />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={!imagePrompt.trim() || generating || cooldownSeconds > 0}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generating
                  ? 'Drawing…'
                  : cooldownSeconds > 0
                    ? `Wait ${cooldownSeconds}s…`
                    : imageUrl
                      ? 'Try another'
                      : '✨ Make cover'}
              </button>
              <CoverBalance remaining={creationsRemaining} cooldownSeconds={cooldownSeconds} />
            </div>
            {(genError || sceneImage.error || pageImage.error) && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                <div className="font-bold">Couldn&apos;t make the cover</div>
                <div className="mt-0.5">
                  {genError ?? sceneImage.error ?? pageImage.error}
                </div>
              </div>
            )}
          </Field>

          {/* ─── Back cover ─── */}
          <div className="mt-3 border-t-2 border-dashed border-amber-200 pt-3">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-base">📖</span>
              <div>
                <div className="text-xs font-bold text-gray-900">Back cover</div>
                <div className="text-[10px] text-gray-500">
                  Shown on the left when your book is open. We always add the date
                  + GSI logo for you.
                </div>
              </div>
            </div>

            <Field label="About the author (you!)">
              <textarea
                value={authorBio}
                onChange={(e) => setAuthorBio(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="I love writing stories about my dog Jerry and our adventures together."
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
              />
            </Field>

            <Field label="About this book">
              <textarea
                value={bookBlurb}
                onChange={(e) => setBookBlurb(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Jerry the dog wasn't sure about Jaisha at first. This is the story of how they became best friends."
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
              />
            </Field>

            {authorPhotoUrl && (
              <div className="mb-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={authorPhotoUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-purple-200"
                />
                <button
                  type="button"
                  onClick={() => setAuthorPhotoUrl(null)}
                  className="text-[11px] text-gray-500 underline hover:text-red-600"
                >
                  Remove author photo
                </button>
              </div>
            )}
          </div>

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

interface CoverCharacterChipProps {
  character: BookCharacter;
  selected: boolean;
  onToggle: () => void;
}

function CoverCharacterChip({ character, selected, onToggle }: CoverCharacterChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-xs font-medium transition-all ${
        selected
          ? 'bg-brand-purple text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 grayscale'
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-2 ${
          selected ? 'ring-white' : 'ring-gray-200'
        }`}
      >
        {character.anchorImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.anchorImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm">🦄</span>
        )}
      </span>
      {character.name || 'Unnamed'}
    </button>
  );
}

function CoverBalance({
  remaining,
  cooldownSeconds,
}: {
  remaining: number;
  cooldownSeconds: number;
}) {
  if (cooldownSeconds > 0) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">
        ⏳ {cooldownSeconds}s · {remaining} left today
      </span>
    );
  }
  if (remaining <= 0) {
    return (
      <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-800">
        Out for today — back tomorrow! ✨
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-800">
      ✨ {remaining} left today
    </span>
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
