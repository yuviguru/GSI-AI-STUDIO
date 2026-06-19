'use client';

/**
 * EditableBook — the in-place editor that IS the whole book (BOOK-008/009/010).
 *
 * One surface, no separate Preview, no separate Cover modal. The kid edits the
 * rendered book directly, leaf by leaf:
 *
 *   Front cover → Page 1 → … → Page N → Back cover
 *
 *  - Every leaf is edited the same way: tap the words → an inline editor (talk
 *    or type); tap the picture → the "Make this page" panel (draw with the
 *    cast, reuse a past picture, or drop a plain colour).
 *  - The FRONT COVER edits its title / subtitle / author + background colour +
 *    picture in place. The BACK COVER edits the blurb + author bio; the date +
 *    GSI footer are added automatically.
 *  - Cover and Back cover are buttons next to "Add a page" (and prev/next
 *    reaches them at the ends), so the kid can write the story first and do the
 *    cover whenever.
 *  - Pixie (the mascot) lives OUTSIDE the book so she never lands on the art.
 *
 * Geometry + colour come from the shared `pageComposition` engine, so what you
 * edit matches the flipbook reader and the PDF.
 */

import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Mic,
  Paintbrush,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import type { Book, BookPage, PageStyleOverride } from '@gsi/types';
import {
  derivePalette,
  readableTextOn,
  autoBodyFontSize,
  maxCharsForPage,
  fontScaleForPageWidth,
  BLANK_PAGE_COLORS,
  type PagePalette,
} from '@/lib/books/pageComposition';
import { SITE_DOMAIN } from '@/lib/brand';
import { BOOK_SIZES, BOOK_FONTS } from '@/lib/templates/bookTemplates';
import { useBookFit } from '@/hooks/useBookFit';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { usePageImage } from '@/hooks/usePageImage';
import { useSceneImage } from '@/hooks/useSceneImage';
import { useSceneEmotions } from '@/hooks/useSceneEmotions';
import { EMOTION_PRESETS, emotionFromTextHeuristic } from '@gsi/ai/prompts/emotionDirection';
import { PixieFloatingBubble } from '@/components/mascot/PixieFloatingBubble';
import { CastEditor } from './CastEditor';

type SavePatch = {
  plainText?: string;
  imageUrl?: string | null;
  imagePrompt?: string;
  style?: PageStyleOverride;
};
type CoverPatch = {
  title?: string;
  subtitle?: string;
  authorName?: string;
  backgroundColor?: string;
  imageUrl?: string | null;
  imagePrompt?: string | null;
  font?: string;
};
type BackPatch = {
  text?: string;
  authorBio?: string | null;
};
/** Real author identity (BOOK-011) — saved on the kid profile + this book. */
type AuthorPatch = {
  name?: string;
  /** Raw base64 (no data: prefix). */
  photoBase64?: string;
  photoContentType?: string;
};
type SaveResult = Promise<{ ok: boolean; error?: string }>;

interface EditableBookProps {
  book: Book;
  pages: BookPage[];
  currentPageId: string | null;
  onSelectPage: (id: string) => void;
  onSave: (patch: SavePatch) => SaveResult;
  onSaveCover: (patch: CoverPatch) => SaveResult;
  onSaveBackCover: (patch: BackPatch) => SaveResult;
  onAppendPage: () => Promise<void>;
  onDeletePage: () => Promise<void>;
  onBookChange: () => Promise<unknown>;
  saving: boolean;
  /** Default author identity from the active kid profile (BOOK-010). Used as a
   *  fallback when the book still says "Anonymous Author" / has no author photo,
   *  so a kid's name + avatar appear by default across all their books. */
  defaultAuthorName?: string;
  defaultAuthorPhoto?: string;
  /** BOOK-011 — save the kid's REAL author identity (name + uploaded photo) to
   *  their profile + this book. Omit when there's no signed-in kid profile. */
  onSaveAuthor?: (patch: AuthorPatch) => SaveResult;
  /** True once the kid has set a real author name or photo on their profile —
   *  silences the back-cover "add your real name & photo" nudge. */
  hasRealAuthorIdentity?: boolean;
}

type Leaf = 'cover' | 'page' | 'back';

/** First non-empty candidate that isn't the "Anonymous Author" placeholder. */
function resolveAuthor(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    const v = (c ?? '').trim();
    if (v && v.toLowerCase() !== 'anonymous author') return v;
  }
  return 'Anonymous Author';
}

const TEXT_COLORS = ['#FFFFFF', '#FDE68A', '#FF9F43', '#FF6B9D', '#7C3AED', '#20C997', '#1F2937'];
const COVER_BG_COLORS = ['#5B5FFF', '#8A5CFF', '#FF9F43', '#20C997', '#FF6B9D', '#3B82F6', '#F59E0B', '#1F2937'];
const SIZE_MIN = 14;
const SIZE_MAX = 34;

export function EditableBook({
  book,
  pages,
  currentPageId,
  onSelectPage,
  onSave,
  onSaveCover,
  onSaveBackCover,
  onAppendPage,
  onDeletePage,
  onBookChange,
  saving,
  defaultAuthorName,
  defaultAuthorPhoto,
  onSaveAuthor,
  hasRealAuthorIdentity = false,
}: EditableBookProps) {
  const palette = derivePalette(book.themeColor);
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const pageIndex = Math.max(0, sorted.findIndex((p) => p.id === currentPageId));
  const page = sorted[pageIndex] ?? null;

  const [leaf, setLeaf] = useState<Leaf>('page');
  const [editingText, setEditingText] = useState(false);
  const [redrawing, setRedrawing] = useState(false);
  const [castOpen, setCastOpen] = useState(false);
  const [pixieMsg, setPixieMsg] = useState<string | undefined>(
    'Tap the words to write, or tap me if you get stuck! 🪄',
  );

  const dims = BOOK_SIZES[book.size];
  const aspect = dims.widthMm / dims.heightMm;
  const fit = useBookFit(aspect, { reserveBelow: 128 });
  // Text scales with the rendered page (like shrinking a printed page) so a
  // small screen doesn't show giant type. The PDF keeps the absolute sizes.
  const fontScale = fontScaleForPageWidth(fit.ready ? fit.width : undefined);

  // Close any open panel when the visible leaf/page changes.
  useEffect(() => {
    setEditingText(false);
    setRedrawing(false);
  }, [leaf, page?.id]);

  // The author-identity nudge comes from PIXIE — never printed on the page.
  // The book surface must only ever show what the published book shows.
  const showAuthorNudge = !!onSaveAuthor && !hasRealAuthorIdentity;
  useEffect(() => {
    if (leaf === 'back' && showAuthorNudge) {
      setPixieMsg(
        'Psst — tap the back cover and add your REAL name & photo. Books with real authors sell better in the Bookshop! 📸',
      );
    }
  }, [leaf, showAuthorNudge]);

  if (!page && leaf === 'page') {
    return <div className="py-16 text-center text-sm text-gray-500">Setting up your book…</div>;
  }

  // Navigation sequence: cover · pages · back.
  const seqLen = sorted.length + 2;
  const seqPos = leaf === 'cover' ? 0 : leaf === 'back' ? seqLen - 1 : 1 + pageIndex;
  const goTo = (pos: number) => {
    if (pos <= 0) setLeaf('cover');
    else if (pos >= seqLen - 1) setLeaf('back');
    else {
      const target = sorted[pos - 1];
      if (target) {
        setLeaf('page');
        onSelectPage(target.id);
      }
    }
  };

  const openText = (msg: string) => {
    setEditingText(true);
    setRedrawing(false);
    setPixieMsg(msg);
  };
  const openRedraw = (msg: string) => {
    setRedrawing(true);
    setEditingText(false);
    setPixieMsg(msg);
  };
  const editing = editingText || redrawing;

  return (
    <div className="relative min-h-full">
      {/* ── Cast strip: characters stay consistent across every picture ── */}
      <CastStrip
        book={book}
        onEdit={() => {
          setCastOpen(true);
          setPixieMsg('Set up your characters once — they look the same in every picture. 🎭');
        }}
      />

      {/* ── The book, scaled to fit the screen ── */}
      <div ref={fit.containerRef} className="relative flex justify-center">
        <div
          className="relative"
          style={
            fit.ready
              ? { width: fit.width, height: fit.height }
              : { width: '100%', maxWidth: '56rem', aspectRatio: `${aspect}` }
          }
        >
          {leaf === 'cover' && (
            <CoverSurface
              book={book}
              palette={palette}
              editing={editing}
              fontScale={fontScale}
              defaultAuthorName={defaultAuthorName}
              onTapImage={() =>
                openRedraw('Draw your cover, or pick a plain colour for it! 🎨')
              }
              onTapText={() => openText('Give your book a title and your author name. ✍️')}
            />
          )}
          {leaf === 'page' && page && (
            <PageSurface
              page={page}
              book={book}
              palette={palette}
              editing={editing}
              fontScale={fontScale}
              onTapImage={() =>
                openRedraw('Draw a picture, or pick a plain colour to write a whole page on! 🎨')
              }
              onTapText={() => openText("Talk to me and I'll write it down, or type it yourself. 🎤")}
            />
          )}
          {leaf === 'back' && (
            <BackSurface
              book={book}
              editing={editing}
              defaultAuthorName={defaultAuthorName}
              defaultAuthorPhoto={defaultAuthorPhoto}
              onTapText={() => openText('Tell readers about your book and about you! ✍️')}
            />
          )}

          {/* ── Panels (overlay the current leaf) ── */}
          {editingText && leaf === 'page' && page && (
            <InlineTextEditor
              page={page}
              book={book}
              palette={palette}
              saving={saving}
              onClose={() => setEditingText(false)}
              onSave={onSave}
              onTalkStart={() => setPixieMsg('Listening… tell me what happens on this page! 🎤')}
            />
          )}
          {editingText && leaf === 'cover' && (
            <CoverTextEditor
              book={book}
              saving={saving}
              defaultAuthorName={defaultAuthorName}
              onClose={() => setEditingText(false)}
              onSaveCover={onSaveCover}
            />
          )}
          {editingText && leaf === 'back' && (
            <BackTextEditor
              book={book}
              saving={saving}
              defaultAuthorName={defaultAuthorName}
              defaultAuthorPhoto={defaultAuthorPhoto}
              onClose={() => setEditingText(false)}
              onSaveBackCover={onSaveBackCover}
              onSaveAuthor={onSaveAuthor}
            />
          )}

          {redrawing && leaf === 'page' && page && (
            <ImageRedraw
              book={book}
              pageId={page.id}
              pageText={page.plainText ?? ''}
              currentImageUrl={page.imageUrl}
              currentPrompt={page.imagePrompt ?? ''}
              imageHistory={page.imageHistory ?? []}
              selectedColor={page.imageUrl ? undefined : page.style?.backgroundColor}
              onGenerated={(url, prompt) => onSave({ imageUrl: url, imagePrompt: prompt })}
              onPickColor={(color) =>
                onSave({
                  imageUrl: null,
                  style: {
                    ...(page.style ?? {}),
                    backgroundColor: color,
                    textColor: page.style?.textColor ?? readableTextOn(color),
                  },
                })
              }
              onRestore={(url) => onSave({ imageUrl: url })}
              onClose={() => setRedrawing(false)}
              onDone={() => setPixieMsg('Lovely! Tap the words to write about this page. ✨')}
            />
          )}
          {redrawing && leaf === 'cover' && (
            <ImageRedraw
              book={book}
              currentImageUrl={book.cover.imageUrl}
              currentPrompt={book.cover.imagePrompt ?? ''}
              imageHistory={[]}
              selectedColor={book.cover.imageUrl ? undefined : book.cover.backgroundColor}
              colorChoices={COVER_BG_COLORS}
              onGenerated={(url, prompt) => onSaveCover({ imageUrl: url, imagePrompt: prompt })}
              onPickColor={(color) => onSaveCover({ imageUrl: null, backgroundColor: color })}
              onRestore={(url) => onSaveCover({ imageUrl: url })}
              onClose={() => setRedrawing(false)}
              onDone={() => setPixieMsg('Great cover! Tap the title to name your book. ✨')}
            />
          )}
        </div>
      </div>

      {/* ── Nav. Group 1: the pages (arrows + dots + add + delete). Group 2:
             Cover / Back, kept separate and at the end. ── */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {/* Group 1 — page navigation + page actions */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => goTo(seqPos - 1)}
            disabled={seqPos === 0}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card transition disabled:opacity-30"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>

          <div className="flex items-center gap-1.5 px-1">
            {sorted.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setLeaf('page');
                  onSelectPage(p.id);
                }}
                aria-label={`Go to page ${p.pageNumber}`}
                className={`h-2.5 rounded-full transition-all ${
                  leaf === 'page' && p.id === page?.id
                    ? 'w-6 bg-brand-purple'
                    : 'w-2.5 bg-purple-200 hover:bg-purple-300'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(seqPos + 1)}
            disabled={seqPos >= seqLen - 1}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card transition disabled:opacity-30"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>

          <button
            type="button"
            onClick={() => void onAppendPage()}
            disabled={sorted.length >= book.pageLimit || saving}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-purple-300 bg-white px-3.5 py-2 text-sm font-semibold text-brand-purple transition hover:bg-purple-50 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add a page
          </button>
          <button
            type="button"
            onClick={() => {
              if (leaf === 'page' && sorted.length > 1) void onDeletePage();
            }}
            disabled={leaf !== 'page' || sorted.length <= 1 || saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold text-rose-400 shadow-card transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
            title={leaf === 'page' ? 'Delete this page' : 'Only story pages can be deleted'}
          >
            <Trash2 className="h-4 w-4" /> Delete page
          </button>
        </div>

        <span className="hidden h-6 w-px bg-gray-200 sm:block" />

        {/* Group 2 — the cover and back cover, on their own, at the end */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLeaf('cover')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${
              leaf === 'cover'
                ? 'bg-brand-purple text-white shadow-button'
                : 'bg-white text-gray-700 shadow-card hover:bg-gray-50'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Cover
          </button>
          <button
            type="button"
            onClick={() => setLeaf('back')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${
              leaf === 'back'
                ? 'bg-brand-purple text-white shadow-button'
                : 'bg-white text-gray-700 shadow-card hover:bg-gray-50'
            }`}
          >
            <BookOpen className="h-4 w-4 -scale-x-100" /> Back
          </button>
        </div>
      </div>

      {sorted.length >= book.pageLimit && (
        <p className="mt-2 text-center text-xs text-gray-400">
          That&apos;s all {book.pageLimit} pages on your plan. Publish it or unlock more.
        </p>
      )}

      {/* ── Cast editor sheet ── */}
      {castOpen && (
        <CastSheet book={book} onChange={onBookChange} onClose={() => setCastOpen(false)} />
      )}

      {/* ── Pixie — OUTSIDE the book, bottom-right ── */}
      <PixieFloatingBubble
        message={pixieMsg}
        onTap={() => setPixieMsg(nextPixieTip(pixieMsg))}
        className="pointer-events-none fixed bottom-4 right-4 z-30 flex items-end justify-end gap-2"
      />
    </div>
  );
}

function clampSize(px: number): number {
  return Math.max(SIZE_MIN, Math.min(SIZE_MAX, px));
}

const PIXIE_TIPS = [
  "Tap the words to write, or talk to me and I'll write it down. 🎤",
  'Tap “Add a picture” to draw a scene — or pick a plain colour to write a full page. 🎨',
  'Use the Cover and Back buttons to design the front and back of your book. 📖',
  "Use ＋ Add a page when you're ready for what happens next. ✨",
];
function nextPixieTip(current?: string): string {
  const i = PIXIE_TIPS.indexOf(current ?? '');
  return PIXIE_TIPS[(i + 1) % PIXIE_TIPS.length]!;
}

/** A little label pill so the kid knows which leaf they're on. */
function LeafBadge({ label }: { label: string }) {
  return (
    <div className="absolute right-3 top-3 z-10 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
      {label}
    </div>
  );
}

/** Compact cast strip — characters stay consistent across generated images. */
function CastStrip({ book, onEdit }: { book: Book; onEdit: () => void }) {
  const cast = book.characters;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
      <span className="text-sm font-semibold text-purple-800">🎭 Your cast</span>
      {cast.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 text-xs font-bold text-gray-800 shadow-sm transition hover:border-purple-300"
        >
          <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-200 to-pink-200 text-sm">
            {c.anchorImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.anchorImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              '🦄'
            )}
          </span>
          {c.name || 'Friend'}
        </button>
      ))}
      <button
        type="button"
        onClick={onEdit}
        className="rounded-full border border-dashed border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-bold text-brand-purple transition hover:bg-purple-100"
      >
        ＋ {cast.length === 0 ? 'Add a character' : 'Edit'}
      </button>
    </div>
  );
}

// ── Surfaces (the rendered, tappable leaf) ───────────────────────

/** A page: full-bleed art (text in the bottom safe-zone) or a plain colour
 *  page (centred text). Tap the picture / words to edit. */
function PageSurface({
  page,
  book,
  palette,
  editing,
  fontScale = 1,
  onTapImage,
  onTapText,
}: {
  page: BookPage;
  book: Book;
  palette: PagePalette;
  editing: boolean;
  fontScale?: number;
  onTapImage: () => void;
  onTapText: () => void;
}) {
  const hasImage = !!page.imageUrl;
  const blankBg = page.style?.backgroundColor ?? palette.pageBg;
  const text = page.plainText ?? '';
  const defaultTextColor = hasImage ? '#ffffff' : readableTextOn(blankBg);
  const bodyFont = page.style?.font ?? book.typography?.bodyFont ?? 'Quicksand';
  const bodyColor = page.style?.textColor ?? defaultTextColor;
  // Stored size stays absolute (print-true); only the RENDER scales with the page.
  const bodySize = Math.max(
    8,
    Math.round(clampSize(page.style?.fontSize ?? autoBodyFontSize(text, { hasImage })) * fontScale),
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-3xl shadow-elevated"
      style={{ backgroundColor: hasImage ? '#000' : blankBg }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        !text && (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-25">✍️</div>
        )
      )}

      {hasImage && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      )}

      {!editing && (
        <button
          type="button"
          onClick={onTapImage}
          className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-gray-800 shadow-card backdrop-blur transition hover:bg-white"
        >
          <ImagePlus className="h-4 w-4" /> {hasImage ? 'Change picture' : 'Add a picture'}
        </button>
      )}

      {!editing && (
        <button
          type="button"
          onClick={onTapText}
          className={
            hasImage
              ? 'group absolute inset-x-[6%] bottom-[7%] z-10 rounded-2xl p-3 text-center transition hover:bg-white/10 hover:ring-2 hover:ring-white/40'
              : 'group absolute inset-0 z-10 flex items-center justify-center px-[8%] text-center transition hover:bg-black/[0.03]'
          }
        >
          <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-purple shadow-card opacity-0 transition group-hover:opacity-100">
            🎤 tap to talk or type
          </span>
          <p
            className="whitespace-pre-wrap leading-snug"
            style={{
              fontFamily: bodyFont,
              fontSize: bodySize,
              color: bodyColor,
              textShadow: hasImage ? '0 2px 10px rgba(0,0,0,.55)' : undefined,
              fontWeight: 600,
            }}
          >
            {text || (
              <span className="opacity-60" style={{ color: defaultTextColor }}>
                Tap to start writing…
              </span>
            )}
          </p>
        </button>
      )}

      <div
        className="absolute bottom-2 right-4 z-10 text-[11px] font-semibold"
        style={{ color: hasImage ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.35)' }}
      >
        {page.pageNumber}
      </div>
    </div>
  );
}

/** The front cover: picture + title/subtitle/author overlay. */
function CoverSurface({
  book,
  palette,
  editing,
  fontScale = 1,
  defaultAuthorName,
  onTapImage,
  onTapText,
}: {
  book: Book;
  palette: PagePalette;
  editing: boolean;
  fontScale?: number;
  defaultAuthorName?: string;
  onTapImage: () => void;
  onTapText: () => void;
}) {
  const cover = book.cover;
  const hasImage = !!cover.imageUrl;
  const bg = cover.backgroundColor || palette.pageBg;
  const authorName = resolveAuthor(cover.authorName, book.author, defaultAuthorName);

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-3xl shadow-elevated"
      style={{ backgroundColor: hasImage ? '#000' : bg }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-40">📖</div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

      <LeafBadge label="Front cover" />

      {!editing && (
        <button
          type="button"
          onClick={onTapImage}
          className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-gray-800 shadow-card backdrop-blur transition hover:bg-white"
        >
          <ImagePlus className="h-4 w-4" /> {hasImage ? 'Change picture' : 'Add a picture'}
        </button>
      )}

      {!editing && (
        <button
          type="button"
          onClick={onTapText}
          className="group absolute inset-x-[6%] bottom-[8%] z-10 rounded-2xl p-3 text-center text-white transition hover:bg-white/10 hover:ring-2 hover:ring-white/40"
        >
          <h1
            className="font-display font-bold leading-tight drop-shadow-md"
            style={{ fontFamily: `'${cover.font}'`, fontSize: Math.max(13, Math.round(24 * fontScale)) }}
          >
            {cover.title || book.title || 'Tap to add a title'}
          </h1>
          {cover.subtitle && (
            <p
              className="mt-1 opacity-90 drop-shadow"
              style={{ fontSize: Math.max(9, Math.round(14 * fontScale)) }}
            >
              {cover.subtitle}
            </p>
          )}
          <p className="mt-2 drop-shadow" style={{ fontSize: Math.max(9, Math.round(14 * fontScale)) }}>
            By {authorName}
          </p>
        </button>
      )}
    </div>
  );
}

/** The back cover: author + blurb + the automatic GSI footer. */
function BackSurface({
  book,
  editing,
  defaultAuthorName,
  defaultAuthorPhoto,
  onTapText,
}: {
  book: Book;
  editing: boolean;
  defaultAuthorName?: string;
  defaultAuthorPhoto?: string;
  onTapText: () => void;
}) {
  const back = book.backCover;
  const authorName = resolveAuthor(book.cover.authorName, book.author, defaultAuthorName);
  const photoUrl =
    back?.authorPhotoUrl ??
    (defaultAuthorPhoto && /^https?:\/\//.test(defaultAuthorPhoto) ? defaultAuthorPhoto : null);
  const initials = authorName.charAt(0).toUpperCase();
  const dateStr = formatDate(book.createdAt);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 shadow-elevated">
      <LeafBadge label="Back cover" />

      <button
        type="button"
        onClick={onTapText}
        disabled={editing}
        className="absolute inset-0 flex flex-col p-6 text-left transition hover:bg-black/[0.02]"
      >
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
            <div className="mt-0.5 font-display text-base font-bold text-gray-900">{authorName}</div>
            {back?.authorBio ? (
              <p className="mt-1 text-xs leading-snug text-gray-700">&ldquo;{back.authorBio}&rdquo;</p>
            ) : (
              <p className="mt-1 text-xs italic text-gray-400">Tap to add a few words about you…</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            About this book
          </div>
          {back?.text ? (
            <p className="mt-1 text-xs leading-relaxed text-gray-700">{back.text}</p>
          ) : (
            <p className="mt-1 text-xs italic text-gray-400">Tap to tell readers what your book is about…</p>
          )}
        </div>

        <div className="flex-1" />

        {/* Marketing CTA — the back cover doubles as GSI's billboard: real logo,
            the vision pitch, and a domain that's configurable via lib/brand. */}
        <div className="mt-3 rounded-2xl border border-amber-200 bg-white/60 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/gsi-logo.svg" alt="" className="h-6 w-auto" />
            <span className="font-display text-sm font-bold text-brand-purple">GSI AI Studio</span>
          </div>
          <div className="mt-1 text-[11px] leading-snug text-gray-600">
            Where kids become real authors — writing books, making music, games &amp; quizzes, and
            learning how AI actually works.
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-brand-purple">
            Create yours at {SITE_DOMAIN}
          </div>
          {dateStr && <div className="mt-1 text-[10px] text-gray-400">Made on {dateStr}</div>}
        </div>
      </button>
    </div>
  );
}

/** Format a Date or ISO string into "June 12, 2026". */
function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Editors (the tap-to-edit panels) ─────────────────────────────

/** Page text editor: talk-first, trimmed styling, page-filling default size. */
function InlineTextEditor({
  page,
  book,
  palette,
  saving,
  onClose,
  onSave,
  onTalkStart,
}: {
  page: BookPage;
  book: Book;
  palette: PagePalette;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: SavePatch) => SaveResult;
  onTalkStart: () => void;
}) {
  const hasImage = !!page.imageUrl;
  const blankBg = page.style?.backgroundColor ?? palette.pageBg;
  const maxChars = maxCharsForPage({ hasImage });

  const [value, setValue] = useState(page.plainText ?? '');
  const [sizeTouched, setSizeTouched] = useState(page.style?.fontSize != null);
  const [style, setStyle] = useState<PageStyleOverride>({
    font: page.style?.font ?? book.typography?.bodyFont ?? 'Quicksand',
    fontSize: page.style?.fontSize ?? autoBodyFontSize(page.plainText ?? '', { hasImage }),
    textColor: page.style?.textColor ?? (hasImage ? '#FFFFFF' : readableTextOn(blankBg)),
    backgroundColor: page.style?.backgroundColor,
  });
  const voice = useVoiceInput({ lang: 'en-IN' });
  const baseRef = useRef('');
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    if (!voice.isRecording) return;
    const joiner = baseRef.current && !baseRef.current.endsWith(' ') ? ' ' : '';
    setValue((baseRef.current + joiner + voice.transcript).trimStart());
  }, [voice.transcript, voice.isRecording]);

  useEffect(() => {
    if (sizeTouched) return;
    setStyle((s) => ({ ...s, fontSize: autoBodyFontSize(value, { hasImage }) }));
  }, [value, sizeTouched, hasImage]);

  const nudgeSize = (delta: number) => {
    setSizeTouched(true);
    setStyle((s) => ({ ...s, fontSize: clampSize((s.fontSize ?? 22) + delta) }));
  };

  const toggleTalk = () => {
    if (voice.isRecording) {
      voice.stopRecording();
    } else {
      baseRef.current = value;
      voice.reset();
      voice.startRecording();
      onTalkStart();
    }
  };

  const handleDone = async () => {
    if (voice.isRecording) voice.stopRecording();
    setSaveErr(null);
    // Keep the editor OPEN if the save fails — otherwise the kid sees the page
    // as saved while the backend kept the old text/style (Codex review #74).
    const saved = await onSave({ plainText: value.trim(), style });
    if (!saved.ok) {
      setSaveErr(saved.error ?? "Couldn't save — check your connection and tap Done again.");
      return;
    }
    onClose();
  };

  const fontSize = clampSize(style.fontSize ?? 22);
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const nearLimit = value.length > maxChars * 0.9;

  return (
    <div className="absolute inset-2 z-20 flex flex-col rounded-3xl bg-white/97 p-3 shadow-elevated backdrop-blur sm:inset-3 sm:p-4">
      <div className="mb-2 flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-purple">
        <Wand2 className="h-4 w-4" /> Your words for this page
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={maxChars}
        placeholder="Tap “Speak it” and say it, or type here…"
        className="w-full flex-1 resize-none rounded-2xl bg-purple-50/70 px-3 py-2.5 leading-snug text-gray-900 focus:outline-none"
        style={{ fontFamily: `'${style.font}'`, fontSize, color: '#241a3d' }}
      />

      <div className="mt-1 flex shrink-0 items-center justify-between text-[11px]">
        <span className="text-gray-400">
          {hasImage ? 'A short caption reads best over a picture.' : 'A full page — write as much as you like!'}
        </span>
        <span className={nearLimit ? 'font-semibold text-amber-600' : 'text-gray-400'}>
          {words} {words === 1 ? 'word' : 'words'} · {value.length}/{maxChars}
        </span>
      </div>

      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-dashed border-gray-200 pt-2.5">
        <StyleControls style={style} setStyle={setStyle} nudgeSize={nudgeSize} />
      </div>

      <TalkActions
        voice={voice}
        saving={saving}
        error={saveErr}
        onToggleTalk={toggleTalk}
        onDone={handleDone}
      />
    </div>
  );
}

/** Front-cover text editor: title / subtitle / author + background colour + font. */
function CoverTextEditor({
  book,
  saving,
  defaultAuthorName,
  onClose,
  onSaveCover,
}: {
  book: Book;
  saving: boolean;
  defaultAuthorName?: string;
  onClose: () => void;
  onSaveCover: (patch: CoverPatch) => SaveResult;
}) {
  const cover = book.cover;
  const resolvedAuthor = resolveAuthor(cover.authorName, book.author, defaultAuthorName);
  const [title, setTitle] = useState(cover.title || book.title || '');
  const [subtitle, setSubtitle] = useState(cover.subtitle ?? '');
  // Pre-fill the author with the kid's name (from their profile) instead of the
  // "Anonymous Author" placeholder, so saving remembers it on the book.
  const [authorName, setAuthorName] = useState(
    resolvedAuthor === 'Anonymous Author' ? '' : resolvedAuthor,
  );
  const [font, setFont] = useState(cover.font || 'Quicksand');
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const handleDone = async () => {
    setSaveErr(null);
    // Keep the editor open on failure so the cover isn't silently lost.
    const saved = await onSaveCover({
      title: title.trim(),
      subtitle: subtitle.trim(),
      authorName: authorName.trim(),
      font,
    });
    if (!saved.ok) {
      setSaveErr(saved.error ?? "Couldn't save your cover — try again.");
      return;
    }
    onClose();
  };

  return (
    <div className="absolute inset-2 z-20 flex flex-col gap-2 overflow-y-auto rounded-3xl bg-white/97 p-3 shadow-elevated backdrop-blur sm:inset-3 sm:p-4">
      <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-purple">
        <Wand2 className="h-4 w-4" /> Your book&apos;s cover
      </div>

      <CoverField label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="My Big Adventure"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base font-bold focus:border-brand-purple focus:outline-none"
          style={{ fontFamily: `'${font}'` }}
        />
      </CoverField>
      <CoverField label="Subtitle (optional)">
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          maxLength={150}
          placeholder="A summer story"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
        />
      </CoverField>
      <CoverField label="Author (you!)">
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={60}
          placeholder="Your name"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
        />
      </CoverField>

      <CoverField label="Title font">
        <div className="flex flex-wrap gap-1.5">
          {BOOK_FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFont(f.name)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                font === f.name ? 'bg-brand-purple text-white' : 'bg-gray-100 text-gray-600'
              }`}
              style={{ fontFamily: `'${f.name}'` }}
            >
              {f.name}
            </button>
          ))}
        </div>
      </CoverField>

      <button
        type="button"
        onClick={handleDone}
        disabled={saving}
        className="mt-1 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-brand-purple to-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-button disabled:opacity-50"
      >
        <Check className="h-4 w-4" /> Done
      </button>
      {saveErr ? (
        <p className="shrink-0 text-center text-[11px] font-semibold text-red-600">{saveErr}</p>
      ) : (
        <p className="shrink-0 text-center text-[11px] text-gray-400">
          Tip: tap the picture to draw the cover art or pick a plain colour.
        </p>
      )}
    </div>
  );
}

/** Back-cover text editor: author identity (real name + photo, BOOK-011) +
 *  bio + blurb. The identity saves to the kid's profile so it carries to all
 *  their books — optional, but nudged ("real authors sell better"). */
function BackTextEditor({
  book,
  saving,
  defaultAuthorName,
  defaultAuthorPhoto,
  onClose,
  onSaveBackCover,
  onSaveAuthor,
}: {
  book: Book;
  saving: boolean;
  defaultAuthorName?: string;
  defaultAuthorPhoto?: string;
  onClose: () => void;
  onSaveBackCover: (patch: BackPatch) => SaveResult;
  onSaveAuthor?: (patch: AuthorPatch) => SaveResult;
}) {
  const initialName = resolveAuthor(book.cover.authorName, book.author, defaultAuthorName);
  const [authorName, setAuthorName] = useState(
    initialName === 'Anonymous Author' ? '' : initialName,
  );
  const [bio, setBio] = useState(book.backCover?.authorBio ?? '');
  const [blurb, setBlurb] = useState(book.backCover?.text ?? '');
  // New photo staged for upload: data-URL preview + base64 payload.
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoContentType, setPhotoContentType] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const currentPhoto =
    photoPreview ??
    book.backCover?.authorPhotoUrl ??
    (defaultAuthorPhoto && /^https?:\/\//.test(defaultAuthorPhoto) ? defaultAuthorPhoto : null);

  const handlePickPhoto = (file: File | undefined) => {
    setPhotoErr(null);
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) {
      setPhotoErr('Pick a JPG, PNG, or WebP photo.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setPhotoErr('That photo is over 3MB — pick a smaller one.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const comma = dataUrl.indexOf(',');
      if (comma < 0) {
        setPhotoErr('Could not read that photo — try another.');
        return;
      }
      setPhotoPreview(dataUrl);
      setPhotoBase64(dataUrl.slice(comma + 1));
      setPhotoContentType(file.type === 'image/jpg' ? 'image/jpeg' : file.type);
    };
    reader.onerror = () => setPhotoErr('Could not read that photo — try another.');
    reader.readAsDataURL(file);
  };

  const handleDone = async () => {
    if (busy) return;
    setBusy(true);
    setPhotoErr(null);
    // Keep the editor open if the back-cover save fails (Codex review #74).
    const savedBack = await onSaveBackCover({ text: blurb.trim(), authorBio: bio.trim() || null });
    if (!savedBack.ok) {
      setPhotoErr(savedBack.error ?? "Couldn't save your back cover — try again.");
      setBusy(false);
      return;
    }
    // Save the author identity (name + new photo) when the kid set either.
    if (onSaveAuthor) {
      const patch: AuthorPatch = {};
      const trimmed = authorName.trim();
      if (trimmed && trimmed !== initialName) patch.name = trimmed;
      if (photoBase64 && photoContentType) {
        patch.photoBase64 = photoBase64;
        patch.photoContentType = photoContentType;
      }
      if (patch.name || patch.photoBase64) {
        const saved = await onSaveAuthor(patch);
        if (!saved.ok) {
          setPhotoErr(saved.error ?? 'Could not save your author details — try again.');
          setBusy(false);
          return;
        }
      }
    }
    setBusy(false);
    onClose();
  };

  return (
    <div className="absolute inset-2 z-20 flex flex-col gap-2 overflow-y-auto rounded-3xl bg-white/97 p-3 shadow-elevated backdrop-blur sm:inset-3 sm:p-4">
      <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-purple">
        <Wand2 className="h-4 w-4" /> Your back cover
      </div>

      {/* Author identity — real name + photo, remembered for all books. */}
      {onSaveAuthor && (
        <div className="shrink-0 rounded-2xl border border-purple-200 bg-purple-50/60 p-2.5">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-purple">
            You, the author
          </div>
          <div className="flex items-start gap-2.5">
            <label className="group relative block h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-full bg-gradient-to-br from-purple-300 to-pink-300 ring-2 ring-white">
              {currentPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-bold text-white">
                  {(authorName || 'A').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[9px] font-bold uppercase text-white opacity-0 transition group-hover:opacity-100">
                Change
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handlePickPhoto(e.target.files?.[0])}
              />
            </label>
            <div className="min-w-0 flex-1">
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                maxLength={60}
                placeholder="Your real name"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold focus:border-brand-purple focus:outline-none"
              />
              <p className="mt-1 text-[10px] leading-snug text-gray-500">
                💡 Books with a real name &amp; photo sell better in the Bookshop. Saved for all
                your books — tap the circle to add your photo.
              </p>
            </div>
          </div>
        </div>
      )}

      <CoverField label="About the author (you!) — keep it short">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={2}
          placeholder="I love writing stories about my dog and our adventures."
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
        />
        <span className="mt-0.5 block text-right text-[10px] text-gray-400">{bio.length}/160</span>
      </CoverField>
      <CoverField label="About this book">
        <textarea
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="A short, exciting summary of what happens in your book."
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none"
        />
      </CoverField>

      {photoErr && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {photoErr}
        </div>
      )}

      <button
        type="button"
        onClick={handleDone}
        disabled={saving || busy}
        className="mt-1 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-brand-purple to-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-button disabled:opacity-50"
      >
        <Check className="h-4 w-4" /> {busy ? 'Saving…' : 'Done'}
      </button>
      <p className="shrink-0 text-center text-[11px] text-gray-400">
        The date + GSI logo are added for you. 📖
      </p>
    </div>
  );
}

function CoverField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block shrink-0">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  );
}

/** Shared colour / size / font row for the page text editor. */
function StyleControls({
  style,
  setStyle,
  nudgeSize,
}: {
  style: PageStyleOverride;
  setStyle: React.Dispatch<React.SetStateAction<PageStyleOverride>>;
  nudgeSize: (delta: number) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Colour</span>
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setStyle((s) => ({ ...s, textColor: c }))}
            className={`h-5 w-5 rounded-full ring-1 ring-gray-200 transition ${
              style.textColor === c ? 'ring-2 ring-brand-purple ring-offset-1' : ''
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Text colour ${c}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Size</span>
        <button type="button" onClick={() => nudgeSize(-2)} className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-bold text-gray-600">
          A−
        </button>
        <button type="button" onClick={() => nudgeSize(2)} className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-bold text-gray-600">
          A+
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Font</span>
        {BOOK_FONTS.slice(0, 3).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStyle((s) => ({ ...s, font: f.name }))}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              style.font === f.name ? 'bg-brand-purple text-white' : 'bg-gray-100 text-gray-600'
            }`}
            style={{ fontFamily: `'${f.name}'` }}
          >
            {f.name}
          </button>
        ))}
      </div>
    </>
  );
}

/** Shared talk-first actions row (mic + Done) with a clear helper line. */
function TalkActions({
  voice,
  saving,
  error,
  onToggleTalk,
  onDone,
}: {
  voice: ReturnType<typeof useVoiceInput>;
  saving: boolean;
  error?: string | null;
  onToggleTalk: () => void;
  onDone: () => void;
}) {
  return (
    <>
      <div className="mt-3 flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleTalk}
          disabled={!voice.isSupported}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-bold text-white shadow-button transition disabled:cursor-not-allowed disabled:opacity-50 ${
            voice.isRecording
              ? 'animate-pulse bg-gradient-to-r from-rose-500 to-orange-500'
              : 'bg-gradient-to-r from-pink-500 to-orange-500'
          }`}
        >
          <Mic className="h-5 w-5" />
          {voice.isRecording ? 'Listening… tap to stop' : 'Speak it'}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-brand-purple to-indigo-500 px-5 py-3 text-sm font-bold text-white shadow-button disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Done
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-center text-[11px] font-semibold text-red-600">{error}</p>
      ) : (
        <p className="mt-1.5 text-center text-[11px] text-gray-400">
          {!voice.isSupported
            ? "Talking isn't supported on this browser — just type in the box above."
            : voice.isRecording
              ? '🔴 Listening… say it out loud and your words appear in the box above.'
              : 'Type in the box above, or tap 🎤 Speak it and say it out loud.'}
        </p>
      )}
    </>
  );
}

/** The picture panel — generic so it works for pages AND the cover. Draw a
 *  scene (choosing which cast is in it), reuse a past picture, or drop a plain
 *  colour. */
function ImageRedraw({
  book,
  pageId,
  pageText,
  currentImageUrl,
  currentPrompt,
  imageHistory,
  selectedColor,
  colorChoices = BLANK_PAGE_COLORS,
  onGenerated,
  onPickColor,
  onRestore,
  onClose,
  onDone,
}: {
  book: Book;
  pageId?: string;
  /** Current page text — seeds the per-character emotion defaults (BOOK-012). */
  pageText?: string;
  currentImageUrl: string | null;
  currentPrompt: string;
  imageHistory: string[];
  selectedColor?: string;
  colorChoices?: readonly string[];
  onGenerated: (url: string, prompt: string) => SaveResult;
  onPickColor: (color: string) => SaveResult;
  onRestore: (url: string) => SaveResult;
  onClose: () => void;
  onDone: () => void;
}) {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [err, setErr] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const sceneImage = useSceneImage();
  const pageImage = usePageImage();
  const sceneEmotions = useSceneEmotions();
  const cast = book.characters;
  const hasCast = cast.length > 0;
  const [selectedIds, setSelectedIds] = useState<string[]>(cast.map((c) => c.id));
  const loading = sceneImage.loading || pageImage.loading;

  // Per-character emotion (BOOK-012). Instant default from the page text via a
  // zero-cost heuristic; then refined per-character by a cheap LLM suggestion.
  // The kid can override any chip.
  const [emotions, setEmotions] = useState<Record<string, string>>(() => {
    const guess = emotionFromTextHeuristic(pageText);
    return Object.fromEntries(cast.map((c) => [c.id, guess]));
  });
  const setEmotion = (charId: string, key: string) =>
    setEmotions((prev) => ({ ...prev, [charId]: key }));

  useEffect(() => {
    if (!hasCast || !pageText || pageText.trim().length < 12) return;
    let cancelled = false;
    void sceneEmotions
      .suggest({ bookId: book.id, pageId, text: pageText, characterIds: cast.map((c) => c.id) })
      .then((res) => {
        if (cancelled || !res) return;
        setEmotions((prev) => {
          const next = { ...prev };
          for (const e of res.emotions) next[e.characterId] = e.emotion;
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
    // Suggest once when the panel opens for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aspect: 'square' | 'portrait' | 'landscape' =
    book.size === 'square' ? 'square' : book.size === 'landscape' ? 'landscape' : 'portrait';

  const toggleChar = (id: string) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const handleDraw = async () => {
    if (prompt.trim().length < 3 || loading) return;
    setErr(null);
    const useScene = hasCast && selectedIds.length > 0;
    const result = useScene
      ? await sceneImage.generate({
          bookId: book.id,
          pageId,
          characterIds: selectedIds,
          action: prompt.trim(),
          emotions: selectedIds.map((id) => ({ characterId: id, emotion: emotions[id] ?? 'curious' })),
        })
      : await pageImage.generate({ prompt: prompt.trim(), aspect, bookId: book.id, pageId });
    if (!result) {
      setErr(sceneImage.error ?? pageImage.error ?? 'Could not draw that — try again.');
      return;
    }
    const saved = await onGenerated(result.imageUrl, prompt.trim());
    if (!saved.ok) {
      setErr(saved.error ?? 'Could not save the picture.');
      return;
    }
    onDone();
    onClose();
  };

  const handleBlank = async (color: string) => {
    if (working) return;
    setWorking(true);
    setErr(null);
    const saved = await onPickColor(color);
    setWorking(false);
    if (!saved.ok) {
      setErr(saved.error ?? 'Could not set the background.');
      return;
    }
    onDone();
    onClose();
  };

  const handleRestore = async (url: string) => {
    if (working || url === currentImageUrl) return;
    setWorking(true);
    setErr(null);
    const saved = await onRestore(url);
    setWorking(false);
    if (!saved.ok) setErr(saved.error ?? 'Could not switch the picture.');
  };

  const gallery = [
    ...(currentImageUrl ? [currentImageUrl] : []),
    ...imageHistory.filter((u) => u !== currentImageUrl),
  ];

  return (
    <div className="absolute inset-2 z-20 overflow-y-auto rounded-3xl bg-white/97 p-3 shadow-elevated backdrop-blur sm:inset-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-purple">
          <Sparkles className="h-4 w-4" /> Make this page
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      {hasCast && (
        <div className="mb-2.5">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Who&apos;s in this picture?
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cast.map((c) => {
              const on = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChar(c.id)}
                  className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs font-bold transition ${
                    on ? 'border-brand-purple bg-purple-50 text-brand-purple' : 'border-gray-200 bg-white text-gray-400'
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-200 to-pink-200 text-[11px]">
                    {c.anchorImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.anchorImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      '🦄'
                    )}
                  </span>
                  {c.name || 'Friend'}
                  {on && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">✨ Picked characters look the same as always.</p>
        </div>
      )}

      {/* How does each character feel? — drives the facial expression so a
          fierce/sad character isn't drawn smiling (BOOK-012). */}
      {hasCast && selectedIds.length > 0 && (
        <div className="mb-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            How does each one feel?
            {sceneEmotions.loading && (
              <span className="font-normal normal-case text-brand-purple">✨ thinking…</span>
            )}
          </div>
          <div className="space-y-1">
            {cast
              .filter((c) => selectedIds.includes(c.id))
              .map((c) => (
                <div key={c.id} className="flex items-center gap-1.5">
                  <span className="w-14 shrink-0 truncate text-[11px] font-bold text-gray-600">
                    {c.name || 'Friend'}
                  </span>
                  <div className="flex flex-wrap gap-0.5">
                    {EMOTION_PRESETS.map((p) => {
                      const active = emotions[c.id] === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setEmotion(c.id, p.key)}
                          title={p.label}
                          aria-pressed={active}
                          className={`rounded-lg px-1 py-0.5 text-base leading-none transition ${
                            active
                              ? 'bg-brand-purple/15 ring-1 ring-brand-purple'
                              : 'opacity-40 hover:opacity-100'
                          }`}
                        >
                          {p.emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        maxLength={400}
        placeholder={hasCast ? 'splashing in the waves at sunset' : 'a sunny beach with palm trees'}
        className="min-h-[110px] w-full resize-none rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
      />
      <button
        type="button"
        onClick={handleDraw}
        disabled={prompt.trim().length < 3 || loading}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-base font-bold text-white shadow-button disabled:opacity-50"
      >
        <Sparkles className="h-5 w-5" />
        {loading ? 'Drawing…' : currentImageUrl ? 'Draw a new picture' : 'Draw it'}
      </button>

      {gallery.length > 0 && (
        <div className="mt-3 border-t border-dashed border-gray-200 pt-2.5">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-gray-600">
            <ImagePlus className="h-3.5 w-3.5" /> Your pictures
            <span className="font-normal text-gray-400">— tap one to use it again</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {gallery.map((url) => {
              const current = url === currentImageUrl;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => void handleRestore(url)}
                  disabled={working}
                  className={`relative h-12 w-12 overflow-hidden rounded-xl ring-1 ring-gray-200 transition hover:scale-105 disabled:opacity-50 ${
                    current ? 'ring-2 ring-brand-purple ring-offset-1' : ''
                  }`}
                  aria-label={current ? 'Current picture' : 'Use this picture again'}
                  title={current ? 'Showing now' : 'Use this picture again'}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {current && (
                    <span className="absolute inset-x-0 bottom-0 bg-brand-purple/90 py-0.5 text-center text-[8px] font-bold uppercase leading-none text-white">
                      now
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 border-t border-dashed border-gray-200 pt-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
          <Paintbrush className="h-3.5 w-3.5" /> …or use a plain {pageId ? 'page' : 'cover'} colour
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {colorChoices.map((c) => {
            const selected = selectedColor === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => void handleBlank(c)}
                disabled={working}
                className={`h-7 w-7 rounded-full ring-1 ring-gray-200 transition hover:scale-110 disabled:opacity-50 ${
                  selected ? 'ring-2 ring-brand-purple ring-offset-1' : ''
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Plain ${c}`}
              />
            );
          })}
        </div>
      </div>

      {err && <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">{err}</div>}
    </div>
  );
}

/** The full cast editor, surfaced as a bottom sheet (reuses CastEditor). */
function CastSheet({
  book,
  onChange,
  onClose,
}: {
  book: Book;
  onChange: () => Promise<unknown>;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-4 shadow-elevated">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">🎭 Your cast</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <CastEditor book={book} onChange={onChange} />
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-2xl bg-brand-purple px-4 py-3 text-sm font-bold text-white shadow-button"
        >
          Done
        </button>
      </div>
    </div>
  );
}
