'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';
import type { Book, BookPage } from '@gsi/types';
import { BOOK_SIZES } from '@/lib/templates/bookTemplates';
import { playSound } from '@/lib/sounds';

interface FlipbookPreviewProps {
  book: Book;
  pages: BookPage[];
  onClose?: () => void;
  readOnly?: boolean;
}

/** A "spread" is what the kid sees when the book is open. In two-page mode
 *  the cover is a real spread (back-cover left, front-cover right) so it
 *  matches the inner-pages dimensions and feels like a real book lying flat
 *  in front of you. */
type Spread =
  | { kind: 'cover' }              // single-page mode: front cover alone
  | { kind: 'cover-spread' }       // two-page mode: back left + front right
  | { kind: 'pages'; left: BookPage | null; right: BookPage | null }
  | { kind: 'back' }                // single-page mode: back cover alone (end of book)
  | { kind: 'end' };

/** Pages spread breakpoint. Below this, render single-page mode (sane on
 *  small phones where two pages would each be ~150px wide). */
const TWO_PAGE_MIN_WIDTH = 768;

function buildSpreads(book: Book, pages: BookPage[], twoPageMode: boolean): Spread[] {
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  const spreads: Spread[] = [];

  if (twoPageMode) {
    // Cover spread: back left + front right. Same dimensions as inner spreads.
    spreads.push({ kind: 'cover-spread' });
    // Pair pages up: 1+2, 3+4, ... last odd page sits alone on its left.
    for (let i = 0; i < sortedPages.length; i += 2) {
      spreads.push({
        kind: 'pages',
        left: sortedPages[i] ?? null,
        right: sortedPages[i + 1] ?? null,
      });
    }
  } else {
    // Single-page mode: front cover alone first.
    spreads.push({ kind: 'cover' });
    for (const page of sortedPages) {
      spreads.push({ kind: 'pages', left: null, right: page });
    }
    // Back cover always shown at end (it always has at least the GSI footer +
    // creation date, even if the kid hasn't customised it).
    spreads.push({ kind: 'back' });
  }

  spreads.push({ kind: 'end' });

  return spreads;
}

/** Swipe distance (px) above which a touch drag counts as a page flip. */
const SWIPE_THRESHOLD = 60;

export function FlipbookPreview({ book, pages, onClose, readOnly = false }: FlipbookPreviewProps) {
  const [index, setIndex] = useState(0);
  const [twoPageMode, setTwoPageMode] = useState(false);
  /** Direction of last flip — feeds into the page-turn animation so the
   *  outgoing/incoming pages rotate from the correct edge (right edge when
   *  going forward, left edge when going back). */
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect viewport once on mount + listen for resize. SSR-safe by starting
  // in single-page mode and switching after mount.
  useEffect(() => {
    const check = () => setTwoPageMode(window.innerWidth >= TWO_PAGE_MIN_WIDTH);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const spreads = buildSpreads(book, pages, twoPageMode);
  const current = spreads[index];

  const dims = BOOK_SIZES[book.size];
  const bookAspect = dims.widthMm / dims.heightMm;

  // Keep index sane when twoPageMode toggles (e.g. resize) — the spread
  // count changes between modes.
  useEffect(() => {
    if (index >= spreads.length) {
      setIndex(spreads.length - 1);
    }
  }, [spreads.length, index]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= spreads.length - 1) return i;
      setFlipDirection('forward');
      playSound('pageFlip');
      return i + 1;
    });
  }, [spreads.length]);

  const prev = useCallback(() => {
    setIndex((i) => {
      if (i <= 0) return i;
      setFlipDirection('backward');
      playSound('pageFlip');
      return i - 1;
    });
  }, []);

  const goFirst = useCallback(() => {
    setFlipDirection('backward');
    setIndex(0);
    playSound('pageFlip');
  }, []);

  const goLast = useCallback(() => {
    setFlipDirection('forward');
    setIndex(spreads.length - 1);
    playSound('pageFlip');
  }, [spreads.length]);

  /** BOOK-005 — keyboard nav. Active whenever the viewer is mounted; Esc
   *  exits fullscreen (or closes the viewer for non-readOnly mounts). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      }
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prev();
          break;
        case 'Home':
          e.preventDefault();
          goFirst();
          break;
        case 'End':
          e.preventDefault();
          goLast();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else if (!readOnly && onClose) {
            onClose();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, goFirst, goLast, onClose, readOnly]);

  /** Track fullscreen state so the toggle button stays in sync. */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    const el = containerRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  /** Framer drag → page-flip when past threshold. Resets via dragSnapToOrigin. */
  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -SWIPE_THRESHOLD) next();
      else if (info.offset.x > SWIPE_THRESHOLD) prev();
    },
    [next, prev],
  );

  const isCover = current?.kind === 'cover';
  const isCoverSpread = current?.kind === 'cover-spread';
  const isBack = current?.kind === 'back';
  const isEnd = current?.kind === 'end';
  const isPages = current?.kind === 'pages';

  // Container shape: spreads (cover-spread + pages in 2-page mode) use
  // book × 2 aspect for the side-by-side layout. Singles (cover, back,
  // end, single-page-mode pages) use book aspect.
  const isWideSpread = isCoverSpread || (isPages && twoPageMode);
  const containerAspect = isWideSpread ? bookAspect * 2 : bookAspect;
  const containerMaxWidthClass = isWideSpread ? 'max-w-3xl' : 'max-w-md';

  // Page-flip motion variants — direction-aware. Forward: outgoing rotates
  // off the right edge; incoming swings in from the right. Backward inverts.
  // perspective + 3D transform-origin makes the flip read as a page turn,
  // not a slide. Not realistic paper curl — that's a separate follow-up.
  const flipVariants = {
    enter: (dir: 'forward' | 'backward') => ({
      rotateY: dir === 'forward' ? 70 : -70,
      x: dir === 'forward' ? 30 : -30,
      opacity: 0,
    }),
    center: { rotateY: 0, x: 0, opacity: 1 },
    exit: (dir: 'forward' | 'backward') => ({
      rotateY: dir === 'forward' ? -70 : 70,
      x: dir === 'forward' ? -30 : 30,
      opacity: 0,
    }),
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center ${
        readOnly ? 'py-2' : 'fixed inset-0 z-50 bg-gray-900/80 p-4 backdrop-blur-sm'
      } ${isFullscreen ? 'bg-gradient-to-br from-stone-900 via-zinc-900 to-stone-900 py-6' : ''}`}
      role="dialog"
      aria-label="Book preview"
      style={{ perspective: 1600 }}
    >
      {!readOnly && onClose && (
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-gray-700 shadow-lg hover:bg-gray-50"
          aria-label="Close preview"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* BOOK-005 — fullscreen toggle. Sits opposite the close button so
          they don't fight for the same corner. */}
      <button
        onClick={toggleFullscreen}
        type="button"
        className={`absolute z-10 rounded-full bg-white/90 p-2 text-gray-700 shadow-lg hover:bg-white ${
          readOnly ? 'right-3 top-3' : 'left-4 top-4'
        }`}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
        title="F · fullscreen"
      >
        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>

      <div
        className={`relative mx-auto w-full ${containerMaxWidthClass}`}
        style={{ aspectRatio: `${containerAspect}` }}
      >
        <AnimatePresence mode="wait" custom={flipDirection}>
          {current && (
            <motion.div
              key={`${index}-${twoPageMode}`}
              custom={flipDirection}
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              dragSnapToOrigin
              onDragEnd={handleDragEnd}
              className={`absolute inset-0 cursor-grab overflow-hidden rounded-2xl shadow-elevated active:cursor-grabbing ${
                isPages && twoPageMode ? '' : 'bg-white'
              }`}
              style={{
                backgroundColor:
                  isCover || isBack ? book.cover.backgroundColor : undefined,
                transformStyle: 'preserve-3d',
                transformOrigin: flipDirection === 'forward' ? 'left center' : 'right center',
              }}
            >
              {isCover && <CoverView book={book} />}

              {isCoverSpread && (
                <div className="grid h-full w-full grid-cols-2">
                  <div className="relative border-r border-gray-200">
                    <BackCoverDesignView book={book} />
                  </div>
                  <div className="relative">
                    <CoverView book={book} />
                  </div>
                </div>
              )}

              {isPages && (
                <PagesSpreadView
                  left={current.left}
                  right={current.right}
                  twoPageMode={twoPageMode}
                />
              )}

              {isBack && <BackCoverDesignView book={book} />}

              {isEnd && <EndView title={book.title} />}
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
          aria-label="Previous page (←)"
          title="← previous"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div
          className={`min-w-[3.5rem] text-center font-mono text-sm drop-shadow ${
            readOnly && !isFullscreen ? 'text-gray-700' : 'text-white'
          }`}
        >
          {index + 1} / {spreads.length}
        </div>
        <button
          type="button"
          onClick={next}
          disabled={index === spreads.length - 1}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card transition-opacity disabled:opacity-30"
          aria-label="Next page (→)"
          title="→ next"
        >
          <ChevronRight className="h-5 w-5 text-gray-700" />
        </button>
      </div>

      <div
        className={`mt-2 text-[11px] ${
          readOnly && !isFullscreen ? 'text-gray-500' : 'text-white/60'
        }`}
      >
        {twoPageMode ? 'Two-page spread' : 'Single page'} · swipe or ← → to flip
      </div>
    </div>
  );
}

function CoverView({ book }: { book: Book }) {
  return (
    <div className="relative h-full w-full">
      {book.cover.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={book.cover.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/40 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-7xl">📖</div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-6 text-center text-white">
        <h1
          className="font-display text-2xl font-bold leading-tight drop-shadow-md"
          style={{ fontFamily: book.cover.font }}
        >
          {book.cover.title || book.title}
        </h1>
        {book.cover.subtitle && (
          <p className="mt-1 text-sm opacity-90 drop-shadow">{book.cover.subtitle}</p>
        )}
        <p className="mt-3 text-sm drop-shadow">
          By {book.cover.authorName || book.author}
        </p>
      </div>
    </div>
  );
}

interface PagesSpreadViewProps {
  left: BookPage | null;
  right: BookPage | null;
  twoPageMode: boolean;
}

function PagesSpreadView({ left, right, twoPageMode }: PagesSpreadViewProps) {
  if (!twoPageMode) {
    // Single-page mode: just render whichever side has the page (right side
    // in our buildSpreads logic).
    const page = right ?? left;
    return (
      <div className="h-full w-full bg-white">
        {page ? <PageView page={page} /> : <BlankSide />}
      </div>
    );
  }

  // Two-page mode: side-by-side pages with a subtle spine separator.
  return (
    <div className="grid h-full w-full grid-cols-2 bg-white">
      <div className="relative border-r border-gray-200">
        {left ? <PageView page={left} /> : <BlankSide />}
      </div>
      <div className="relative">
        {right ? <PageView page={right} /> : <BlankSide />}
      </div>
    </div>
  );
}

function BlankSide() {
  return (
    <div className="h-full w-full bg-gradient-to-br from-gray-50 to-gray-100" aria-hidden />
  );
}

/** Format a Date or ISO string into a kid-friendly "May 6, 2026" string.
 *  SWR-deserialized Books have createdAt as a string; bookService-fresh
 *  Books have it as a Date. Handle both. */
function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** "About the book" back cover. Always renders (at minimum: author name,
 *  creation date, and GSI branding). Optional sections: author photo,
 *  author bio, book blurb. */
function BackCoverDesignView({ book }: { book: Book }) {
  const back = book.backCover;
  const authorName = book.author || 'Anonymous Author';
  const photoUrl = back?.authorPhotoUrl ?? null;
  const initials = authorName.charAt(0).toUpperCase();
  const hasAuthorBio = !!back?.authorBio;
  const hasBlurb = !!back?.text;
  const dateStr = formatDate(book.createdAt);

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-5 text-gray-800">
      {/* Author section — always shows at least name */}
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-300 to-pink-300 text-xl font-bold text-white shadow-sm ring-2 ring-white">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            About the author
          </div>
          <div className="mt-0.5 font-display text-base font-bold text-gray-900">
            {authorName}
          </div>
          {hasAuthorBio && (
            <p className="mt-1 text-xs leading-snug text-gray-700">
              &ldquo;{back!.authorBio}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Book blurb — only if set */}
      {hasBlurb && (
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            About this book
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-700">{back!.text}</p>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* GSI branding footer — always present */}
      <div className="mt-3 border-t-2 border-amber-200 pt-2 text-center">
        <div className="font-display text-sm font-bold text-brand-purple">
          ✨ GSI AI Studio
        </div>
        {dateStr && (
          <div className="mt-0.5 text-[10px] text-gray-500">Made on {dateStr}</div>
        )}
        <div className="mt-0.5 text-[10px] text-gray-400">
          gsi-ai-studio.netlify.app
        </div>
      </div>
    </div>
  );
}

function EndView({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <h3 className="text-lg font-semibold text-brand-purple">Made with GSI AI Studio</h3>
      <p className="mt-2 text-xs text-gray-500">The end — thanks for reading {title}!</p>
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
