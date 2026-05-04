'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Book, BookPage } from '@/types/book.types';
import { BOOK_SIZES } from '@/lib/templates/bookTemplates';

interface FlipbookPreviewProps {
  book: Book;
  pages: BookPage[];
  onClose?: () => void;
  readOnly?: boolean;
}

type Spread =
  | { kind: 'cover' }
  | { kind: 'page'; page: BookPage }
  | { kind: 'back' }
  | { kind: 'end' };

function buildSpreads(book: Book, pages: BookPage[]): Spread[] {
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const spreads: Spread[] = [{ kind: 'cover' }, ...sortedPages.map((p): Spread => ({ kind: 'page', page: p }))];
  if (book.backCover && (book.backCover.text || book.backCover.imageUrl)) {
    spreads.push({ kind: 'back' });
  }
  spreads.push({ kind: 'end' });
  return spreads;
}

export function FlipbookPreview({ book, pages, onClose, readOnly = false }: FlipbookPreviewProps) {
  const [index, setIndex] = useState(0);
  const spreads = buildSpreads(book, pages);
  const current = spreads[index];

  const dims = BOOK_SIZES[book.size];
  const aspectRatio = dims.widthMm / dims.heightMm;

  const next = () => setIndex((i) => Math.min(i + 1, spreads.length - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  const isCover = current?.kind === 'cover';
  const isBack = current?.kind === 'back';
  const isEnd = current?.kind === 'end';

  return (
    <div
      className={`flex flex-col items-center justify-center ${
        readOnly ? '' : 'fixed inset-0 z-50 bg-gray-900/80 p-4 backdrop-blur-sm'
      }`}
      role="dialog"
      aria-label="Book preview"
    >
      {!readOnly && onClose && (
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 rounded-full bg-white p-2 text-gray-700 shadow-lg hover:bg-gray-50"
          aria-label="Close preview"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div
        className="relative mx-auto w-full max-w-md"
        style={{ aspectRatio: `${aspectRatio}` }}
      >
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={index}
              initial={{ opacity: 0, rotateY: -8 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 8 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 overflow-hidden rounded-2xl bg-white shadow-elevated"
              style={{
                backgroundColor: isCover || isBack ? book.cover.backgroundColor : '#ffffff',
              }}
            >
              {isCover && (
                <div className="flex h-full w-full flex-col">
                  {book.cover.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.cover.imageUrl}
                      alt=""
                      className="h-3/5 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-3/5 w-full items-center justify-center text-7xl">📖</div>
                  )}
                  <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-white">
                    <h1 className="text-2xl font-bold leading-tight">
                      {book.cover.title || book.title}
                    </h1>
                    {book.cover.subtitle && (
                      <p className="mt-1 text-sm opacity-90">{book.cover.subtitle}</p>
                    )}
                    <p className="mt-3 text-sm">
                      By {book.cover.authorName || book.author}
                    </p>
                  </div>
                </div>
              )}

              {current.kind === 'page' && <PageView page={current.page} />}

              {isBack && book.backCover && (
                <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-white">
                  {book.backCover.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.backCover.imageUrl}
                      alt=""
                      className="mb-4 max-h-48 w-full rounded-xl object-cover"
                    />
                  )}
                  <p className="text-sm">{book.backCover.text}</p>
                </div>
              )}

              {isEnd && (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 p-6 text-center">
                  <h3 className="text-lg font-semibold text-brand-purple">
                    Made with GSI AI Studio
                  </h3>
                  <p className="mt-2 text-xs text-gray-500">
                    The end — thanks for reading {book.title}!
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card transition-opacity disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div className="text-sm text-white drop-shadow">
          {index + 1} / {spreads.length}
        </div>
        <button
          type="button"
          onClick={next}
          disabled={index === spreads.length - 1}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card transition-opacity disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}

function PageView({ page }: { page: BookPage }) {
  const isFullBleed = page.layout === 'image_full_bleed' || page.layout === 'gallery';
  const isImageTop = page.layout === 'image_top_text_bottom' || page.layout === 'concept_letter';
  const isTextOnly = page.layout === 'text_only' || page.layout === 'entry_centered';
  const isCentered = page.layout === 'entry_centered';

  if (isFullBleed && page.imageUrl) {
    return (
      <div className="relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={page.imageUrl} alt="" className="h-full w-full object-cover" />
        {page.plainText && (
          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-3 text-center text-sm text-white">
            {page.plainText}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full flex-col p-4 ${isCentered ? 'items-center justify-center' : ''}`}
      style={{
        fontFamily: page.style?.font ?? undefined,
        color: page.style?.textColor ?? undefined,
        backgroundColor: page.style?.backgroundColor ?? undefined,
      }}
    >
      {page.imageUrl && isImageTop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.imageUrl}
          alt=""
          className="mb-3 h-1/2 w-full rounded-xl object-cover"
        />
      )}

      <div
        className={`flex-1 whitespace-pre-wrap text-sm leading-relaxed ${
          isCentered ? 'text-center' : ''
        }`}
        style={{
          fontSize: page.style?.fontSize ? `${page.style.fontSize}px` : undefined,
          textAlign: page.style?.alignment ?? (isCentered ? 'center' : undefined),
        }}
      >
        {page.plainText || <span className="text-gray-400">(empty)</span>}
      </div>

      {page.imageUrl && !isImageTop && !isTextOnly && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.imageUrl}
          alt=""
          className="mt-3 h-1/2 w-full rounded-xl object-cover"
        />
      )}

      <div className="mt-1 text-center text-[10px] text-gray-400">{page.pageNumber}</div>
    </div>
  );
}
