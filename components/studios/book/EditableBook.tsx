'use client';

/**
 * EditableBook — the in-place "edit the book like you read it" editor (BOOK-008).
 *
 * One screen. The rendered spread IS the editor — no rich-text toolbar, no
 * separate Picture/Grammar panels, no separate Preview modal:
 *  - Tap the words → an inline editor opens ON the page: a big talk-first mic
 *    (voice dictation = the "recitation" made obvious) + type, plus light
 *    colour / size / font (no alignment).
 *  - Tap the picture → redraw it (character-aware when the book has a cast).
 *  - Cast strip on top keeps characters consistent across every picture.
 *  - Add / delete pages from the nav.
 *  - Pixie (the mascot) lives OUTSIDE the book card so she never lands on the
 *    page art or the printed/exported book.
 *
 * Geometry comes from the shared `pageComposition` engine, so what you edit
 * matches the flipbook reader and the PDF.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Mic,
  Plus,
  Sparkles,
  Trash2,
  Type as TypeIcon,
  Wand2,
  X,
} from 'lucide-react';
import type { Book, BookPage, PageStyleOverride } from '@gsi/types';
import { derivePalette } from '@/lib/books/pageComposition';
import { BOOK_SIZES, BOOK_FONTS } from '@/lib/templates/bookTemplates';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { usePageImage } from '@/hooks/usePageImage';
import { useSceneImage } from '@/hooks/useSceneImage';
import { PixieFloatingBubble } from '@/components/mascot/PixieFloatingBubble';
import { CastEditor } from './CastEditor';

type SavePatch = {
  plainText?: string;
  imageUrl?: string;
  imagePrompt?: string;
  style?: PageStyleOverride;
};

interface EditableBookProps {
  book: Book;
  pages: BookPage[];
  currentPageId: string | null;
  onSelectPage: (id: string) => void;
  onSave: (patch: SavePatch) => Promise<{ ok: boolean; error?: string }>;
  onAppendPage: () => Promise<void>;
  onDeletePage: () => Promise<void>;
  onBookChange: () => Promise<unknown>;
  saving: boolean;
}

const TEXT_COLORS = ['#FFFFFF', '#FDE68A', '#FF9F43', '#FF6B9D', '#7C3AED', '#20C997', '#1F2937'];
const SIZE_MIN = 14;
const SIZE_MAX = 34;

export function EditableBook({
  book,
  pages,
  currentPageId,
  onSelectPage,
  onSave,
  onAppendPage,
  onDeletePage,
  onBookChange,
  saving,
}: EditableBookProps) {
  const palette = derivePalette(book.themeColor);
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const index = Math.max(0, sorted.findIndex((p) => p.id === currentPageId));
  const page = sorted[index] ?? null;

  const [editingText, setEditingText] = useState(false);
  const [redrawing, setRedrawing] = useState(false);
  const [castOpen, setCastOpen] = useState(false);
  const [pixieMsg, setPixieMsg] = useState<string | undefined>(
    'Tap the words to write your page, or tap me if you get stuck! 🪄',
  );

  // Reset overlays when navigating pages.
  useEffect(() => {
    setEditingText(false);
    setRedrawing(false);
  }, [page?.id]);

  if (!page) {
    return <div className="py-16 text-center text-sm text-gray-500">Setting up your book…</div>;
  }

  const dims = BOOK_SIZES[book.size];
  const aspect = dims.widthMm / dims.heightMm;
  const hasImage = !!page.imageUrl;
  const text = page.plainText ?? '';

  const goPrev = () => sorted[index - 1] && onSelectPage(sorted[index - 1]!.id);
  const goNext = () => sorted[index + 1] && onSelectPage(sorted[index + 1]!.id);

  return (
    <div className="relative">
      {/* ── Cast strip: characters stay consistent across every picture ── */}
      <CastStrip
        book={book}
        onEdit={() => {
          setCastOpen(true);
          setPixieMsg('Set up your characters once — they look the same in every picture. 🎭');
        }}
      />

      {/* ── The spread = the editor ── */}
      <div
        className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl shadow-elevated"
        style={{ aspectRatio: `${aspect}`, backgroundColor: hasImage ? '#000' : palette.pageBg }}
      >
        {/* Full-bleed art */}
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-40">📖</div>
        )}

        {/* Redraw target */}
        <button
          type="button"
          onClick={() => {
            setRedrawing(true);
            setEditingText(false);
            setPixieMsg('Tell me what the picture should show and I\'ll draw it! 🎨');
          }}
          className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-gray-800 shadow-card backdrop-blur transition hover:bg-white"
        >
          <ImagePlus className="h-4 w-4" /> {hasImage ? 'New picture' : 'Add a picture'}
        </button>

        {/* Scrim behind overlay text */}
        {hasImage && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        )}

        {/* Text safe-zone — tap to edit */}
        {!editingText && (
          <button
            type="button"
            onClick={() => {
              setEditingText(true);
              setPixieMsg('Talk to me and I\'ll write it down, or type it yourself. 🎤');
            }}
            className="group absolute inset-x-[6%] bottom-[7%] z-10 rounded-2xl p-3 text-center transition hover:bg-white/10 hover:ring-2 hover:ring-white/40"
          >
            <span className="pointer-events-none absolute -top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-purple shadow-card opacity-0 transition group-hover:opacity-100">
              🎤 tap to talk or type
            </span>
            <p
              className="whitespace-pre-wrap leading-snug"
              style={{
                fontFamily: page.style?.font ?? book.typography?.bodyFont ?? 'Quicksand',
                fontSize: clampSize(page.style?.fontSize ?? 22),
                color: page.style?.textColor ?? (hasImage ? '#fff' : palette.text),
                textShadow: hasImage ? '0 2px 10px rgba(0,0,0,.55)' : undefined,
                fontWeight: 600,
              }}
            >
              {text || <span className="opacity-70">Tap to start writing…</span>}
            </p>
          </button>
        )}

        {/* Inline text editor */}
        {editingText && (
          <InlineTextEditor
            page={page}
            book={book}
            saving={saving}
            onClose={() => setEditingText(false)}
            onSave={onSave}
            onTalkStart={() => setPixieMsg('Listening… tell me what happens on this page! 🎤')}
          />
        )}

        {/* Image redraw */}
        {redrawing && (
          <ImageRedraw
            book={book}
            page={page}
            onClose={() => setRedrawing(false)}
            onSave={onSave}
            onDone={() => setPixieMsg('Lovely! Tap the words to write about your new picture. ✨')}
          />
        )}

        {/* Page number */}
        <div className="absolute bottom-2 right-4 z-10 text-[11px] font-semibold text-white/70">
          {page.pageNumber}
        </div>
      </div>

      {/* ── Nav + page actions ── */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card transition disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>

        <div className="flex items-center gap-1.5">
          {sorted.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPage(p.id)}
              aria-label={`Go to page ${p.pageNumber}`}
              className={`h-2.5 rounded-full transition-all ${
                p.id === page.id ? 'w-6 bg-brand-purple' : 'w-2.5 bg-purple-200 hover:bg-purple-300'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={index >= sorted.length - 1}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card transition disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5 text-gray-700" />
        </button>

        <span className="mx-1 h-6 w-px bg-gray-200" />

        <button
          type="button"
          onClick={() => void onAppendPage()}
          disabled={sorted.length >= book.pageLimit || saving}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-purple-300 bg-white px-4 py-2 text-sm font-semibold text-brand-purple transition hover:bg-purple-50 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Add a page
        </button>
        <button
          type="button"
          onClick={() => {
            if (sorted.length > 1) void onDeletePage();
          }}
          disabled={sorted.length <= 1 || saving}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-rose-400 shadow-card transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
          aria-label="Delete this page"
          title="Delete this page"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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

      {/* ── Pixie — OUTSIDE the book, anchored to the screen ── */}
      <PixieFloatingBubble
        message={pixieMsg}
        onTap={() => setPixieMsg(nextPixieTip(pixieMsg))}
        className="pointer-events-none fixed bottom-4 left-4 z-30 flex items-end gap-2"
      />
    </div>
  );
}

function clampSize(px: number): number {
  return Math.max(SIZE_MIN, Math.min(SIZE_MAX, px));
}

const PIXIE_TIPS = [
  'Tap the words to write your page, or talk to me and I\'ll write it down. 🎤',
  'Tap the picture to draw a new one — just tell me what to make. 🎨',
  'Tap a character up top to fix how they look — they stay the same everywhere. 🎭',
  'Use ＋ Add a page when you\'re ready for what happens next. ✨',
];
function nextPixieTip(current?: string): string {
  const i = PIXIE_TIPS.indexOf(current ?? '');
  return PIXIE_TIPS[(i + 1) % PIXIE_TIPS.length]!;
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
      <span className="text-[11px] font-medium text-gray-400">they look the same in every picture</span>
    </div>
  );
}

/** The tap-to-edit popup: talk-first, with trimmed styling (colour/size/font). */
function InlineTextEditor({
  page,
  book,
  saving,
  onClose,
  onSave,
  onTalkStart,
}: {
  page: BookPage;
  book: Book;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: SavePatch) => Promise<{ ok: boolean; error?: string }>;
  onTalkStart: () => void;
}) {
  const [value, setValue] = useState(page.plainText ?? '');
  const [style, setStyle] = useState<PageStyleOverride>({
    font: page.style?.font ?? book.typography?.bodyFont ?? 'Quicksand',
    fontSize: page.style?.fontSize ?? 22,
    textColor: page.style?.textColor ?? '#FFFFFF',
  });
  const voice = useVoiceInput({ lang: 'en-IN' });
  const baseRef = useRef('');

  // Append live transcript to whatever was there when recording started.
  useEffect(() => {
    if (!voice.isRecording) return;
    const joiner = baseRef.current && !baseRef.current.endsWith(' ') ? ' ' : '';
    setValue((baseRef.current + joiner + voice.transcript).trimStart());
  }, [voice.transcript, voice.isRecording]);

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
    await onSave({ plainText: value.trim(), style });
    onClose();
  };

  const fontSize = clampSize(style.fontSize ?? 22);

  return (
    <div className="absolute inset-x-[4%] bottom-[5%] z-20 rounded-3xl bg-white/97 p-4 shadow-elevated backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-purple">
        <Wand2 className="h-4 w-4" /> Your words for this page
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Tap “Talk” and say it, or type here…"
        className="w-full resize-none rounded-2xl bg-purple-50/70 px-3 py-2.5 leading-snug text-gray-900 focus:outline-none"
        style={{ fontFamily: `'${style.font}'`, fontSize, color: '#241a3d' }}
      />

      {/* styling: colour + size + font (no alignment) */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-dashed border-gray-200 pt-2.5">
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
          <button
            type="button"
            onClick={() => setStyle((s) => ({ ...s, fontSize: clampSize((s.fontSize ?? 22) - 2) }))}
            className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-bold text-gray-600"
          >
            A−
          </button>
          <button
            type="button"
            onClick={() => setStyle((s) => ({ ...s, fontSize: clampSize((s.fontSize ?? 22) + 2) }))}
            className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-bold text-gray-600"
          >
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
      </div>

      {/* talk-first actions */}
      <div className="mt-3 flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleTalk}
          disabled={!voice.isSupported}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-bold text-white shadow-button transition disabled:opacity-50 ${
            voice.isRecording
              ? 'animate-pulse bg-gradient-to-r from-rose-500 to-orange-500'
              : 'bg-gradient-to-r from-pink-500 to-orange-500'
          }`}
        >
          <Mic className="h-5 w-5" />
          {voice.isRecording ? 'Listening… speak!' : "Talk — I'll write it"}
        </button>
        <span className="hidden items-center gap-1 rounded-2xl bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-500 sm:flex">
          <TypeIcon className="h-4 w-4" /> or type
        </span>
        <button
          type="button"
          onClick={handleDone}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-brand-purple to-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-button disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Done
        </button>
      </div>
      {!voice.isSupported && (
        <p className="mt-1.5 text-center text-[11px] text-gray-400">
          Talking isn&apos;t supported on this browser. Type your words above.
        </p>
      )}
    </div>
  );
}

/** Tap-the-picture redraw — character-aware when the book has a cast. */
function ImageRedraw({
  book,
  page,
  onClose,
  onSave,
  onDone,
}: {
  book: Book;
  page: BookPage;
  onClose: () => void;
  onSave: (patch: SavePatch) => Promise<{ ok: boolean; error?: string }>;
  onDone: () => void;
}) {
  const [prompt, setPrompt] = useState(page.imagePrompt ?? '');
  const [err, setErr] = useState<string | null>(null);
  const sceneImage = useSceneImage();
  const pageImage = usePageImage();
  const hasCast = book.characters.length > 0;
  const loading = sceneImage.loading || pageImage.loading;

  const aspect: 'square' | 'portrait' | 'landscape' =
    book.size === 'square' ? 'square' : book.size === 'landscape' ? 'landscape' : 'portrait';

  const handleDraw = async () => {
    if (prompt.trim().length < 3 || loading) return;
    setErr(null);
    const result = hasCast
      ? await sceneImage.generate({
          bookId: book.id,
          pageId: page.id,
          characterIds: book.characters.map((c) => c.id),
          action: prompt.trim(),
        })
      : await pageImage.generate({ prompt: prompt.trim(), aspect, bookId: book.id, pageId: page.id });
    if (!result) {
      setErr(sceneImage.error ?? pageImage.error ?? 'Could not draw that — try again.');
      return;
    }
    const saved = await onSave({ imageUrl: result.imageUrl, imagePrompt: prompt.trim() });
    if (!saved.ok) {
      setErr(saved.error ?? 'Could not save the picture.');
      return;
    }
    onDone();
    onClose();
  };

  return (
    <div className="absolute inset-x-[4%] bottom-[5%] z-20 rounded-3xl bg-white/97 p-4 shadow-elevated backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-purple">
          <Sparkles className="h-4 w-4" /> What should the picture show?
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        maxLength={400}
        placeholder={hasCast ? 'Mango splashing in the waves at sunset' : 'a sunny beach with palm trees'}
        className="w-full resize-none rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
      />
      {hasCast && (
        <p className="mt-1 text-[11px] text-gray-500">
          ✨ {book.characters.map((c) => c.name).join(' & ')} will look the same as always.
        </p>
      )}
      <button
        type="button"
        onClick={handleDraw}
        disabled={prompt.trim().length < 3 || loading}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-base font-bold text-white shadow-button disabled:opacity-50"
      >
        <Sparkles className="h-5 w-5" />
        {loading ? 'Drawing…' : page.imageUrl ? 'Draw a new picture' : 'Draw it'}
      </button>
      {err && (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">{err}</div>
      )}
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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true">
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
