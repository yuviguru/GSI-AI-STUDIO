'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Lock,
  Plus,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useBookList } from '@/hooks/useBookList';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { useResolvedIdentity } from '@/hooks/useResolvedIdentity';
import { NewBookWizard } from './NewBookWizard';
import { BookCreationModeChooser, type BookCreationMode } from './BookCreationModeChooser';
import { AiGenerateBookForm } from './AiGenerateBookForm';
import { EffortBadge } from './EffortBadge';
import { FeaturedBooksRail } from './FeaturedBooksRail';
import { BookTemplateGallery } from './BookTemplateGallery';
import { BookTile } from '@/components/studios/shared/BookTile';
import { StudioBadgeStrip } from '@/components/studios/shared/StudioBadgeStrip';
import { StudioStreakCard } from '@/components/studios/shared/StudioStreakCard';
import { getBookTypeCard } from '@/lib/templates/bookTemplates';
import type { BookListItem, BookType } from '@gsi/types';

type View = 'library' | 'wizard' | 'ai_form';

/**
 * Book Studio home — mirrors the Hub's split: stacked single-column on
 * mobile, hub-style 3-column viewport-locked grid on lg+. The desktop
 * layout fits everything (stats, badges, streak, hero, template gallery,
 * library, featured) in a single screen — only the library grid scrolls
 * within its own column. Matches Hub's `flex h-screen flex-col overflow-hidden`
 * pattern, adjusted for the GameNavBar + LayoutBackLink chrome above.
 *
 * Border-radius across this page is standardized at `rounded-lg` (8px) to
 * match the Hub's design language (`PlayerCard`, `HeroStage`, `BadgesCard`,
 * `ModeTile` all use the same value). Don't introduce other radii on this
 * page without also updating the Hub for consistency.
 */
export function BookStudioClient() {
  const router = useRouter();
  const [view, setView] = useState<View>('library');
  // When a template gallery card is clicked, we seed the wizard with that
  // BookType so it skips the type picker. `null` → "Blank book" path
  // (wizard opens at step 1 with nothing pre-selected).
  const [wizardSeed, setWizardSeed] = useState<BookType | null>(null);
  // BOOK-002: when the chooser is open, tapping "Manual" feeds this seed
  // into the wizard. Template-gallery picks skip the chooser since the kid
  // already committed to a specific book type (i.e. they want to write it).
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserSeed, setChooserSeed] = useState<BookType | null>(null);
  const { items, isLoading, error, refresh } = useBookList();

  // Library "Start new book" entry — show the BOOK-002 chooser first.
  // Template-gallery picks skip the chooser (they're a clear "manual" intent).
  const openWizard = useCallback((type?: BookType) => {
    if (type) {
      // Template-gallery pick — straight to the manual wizard.
      setWizardSeed(type);
      setView('wizard');
      return;
    }
    setChooserSeed(null);
    setChooserOpen(true);
  }, []);

  const handlePickMode = useCallback(
    (mode: BookCreationMode) => {
      setChooserOpen(false);
      if (mode === 'manual') {
        setWizardSeed(chooserSeed);
        setView('wizard');
      } else {
        setView('ai_form');
      }
    },
    [chooserSeed],
  );

  const drafts = useMemo(
    () => items.filter((b) => b.status === 'draft' || b.status === 'complete'),
    [items],
  );
  const published = useMemo(
    () => items.filter((b) => b.status === 'published'),
    [items],
  );
  // The hero "Continue …" ignores books that are still generating — they aren't
  // openable yet (BOOK-008), so it resumes the latest *ready* draft instead.
  const latestDraft = useMemo(
    () =>
      pickLatest(
        drafts.filter(
          (b) => !(b.generation?.status === 'pending' || b.generation?.status === 'generating'),
        ),
      ),
    [drafts],
  );

  // Wizard branch keeps a normal-scroll layout — the wizard is its own flow.
  if (view === 'wizard') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-purple-50 px-4 py-4">
        <DecorativeSparkles />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setView('library')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-purple"
            >
              <ArrowLeft className="h-4 w-4" />
              My Books
            </button>
          </div>
          <NewBookWizard
            onClose={() => setView('library')}
            initialType={wizardSeed ?? undefined}
          />
        </div>
      </div>
    );
  }

  // BOOK-002 — AI generate form branch
  if (view === 'ai_form') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-amber-50 via-white to-orange-50 px-4 py-4">
        <DecorativeSparkles />
        <div className="relative mx-auto max-w-2xl pt-4">
          <AiGenerateBookForm
            onClose={() => {
              setView('library');
              refresh(); // surface the new pending book's progress tile
            }}
          />
        </div>
      </div>
    );
  }

  const onResume = (book: BookListItem) => router.push(`/create/book/${book.id}`);

  return (
    <div className="relative bg-gradient-to-b from-indigo-50 via-white to-purple-50">
      <DecorativeSparkles />

      {/* Mobile / tablet — stacked layout, page scrolls naturally */}
      <div className="relative mx-auto max-w-6xl px-4 py-4 lg:hidden">
        <div className="mb-5 grid grid-cols-1 gap-4">
          <HeroContinue
            latest={latestDraft}
            onStartNew={() => openWizard()}
            onResume={onResume}
          />
          <AuthorStats
            written={items.length}
            inProgress={drafts.length}
            published={published.length}
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4">
          <StudioBadgeStrip idPrefix="book_" title="Book Badges" emoji="🏆" />
          <StudioStreakCard
            studio="book"
            label="Book Streak"
            emptyMessage="Write today to start a streak!"
          />
        </div>

        <BookTemplateGallery onPick={openWizard} />

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {isLoading && items.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500">
            Loading your library…
          </div>
        )}
        {!isLoading && items.length === 0 && <EmptyLibraryPill />}

        {drafts.length > 0 && (
          <LibraryRail title="In progress" emoji="✏️" books={drafts} quest />
        )}
        {published.length > 0 && (
          <LibraryRail title="Published" emoji="🎉" books={published} />
        )}

        <FeaturedBooksRail variant="horizontal" />
      </div>

      {/* Desktop hub-style — viewport-locked 3-column grid (lg+). Chrome
          above (GameNavBar 48px + LayoutBackLink ~40px) is subtracted from
          100dvh so the whole page fits in one screen.

          `minmax(0, 1fr)` for the center column (instead of bare `1fr`) is
          essential: `1fr` is shorthand for `minmax(auto, 1fr)`, and the
          `auto` minimum lets the column grow to fit the template gallery's
          intrinsic 7-card width — pushing the RIGHT column off-screen. The
          `min-w-0` on each section/aside reinforces this so `overflow-x-auto`
          inside the gallery + library actually kicks in. */}
      <div className="hidden lg:flex lg:h-[calc(100dvh-88px)] lg:flex-col lg:overflow-hidden">
        <main className="mx-auto grid min-h-0 w-full max-w-[1520px] flex-1 grid-cols-[280px_minmax(0,1fr)_300px] gap-5 overflow-hidden px-6 py-5 xl:gap-6 xl:px-8">
          {/* LEFT — author identity column */}
          <aside className="flex min-h-0 min-w-0 flex-col gap-3">
            <AuthorStats
              written={items.length}
              inProgress={drafts.length}
              published={published.length}
            />
            <StudioBadgeStrip idPrefix="book_" title="Book Badges" emoji="🏆" />
            <StudioStreakCard
              studio="book"
              label="Book Streak"
              emptyMessage="Write today to start a streak!"
            />
          </aside>

          {/* CENTER — action surface */}
          <section className="flex min-h-0 min-w-0 flex-col gap-3">
            <HeroContinue
              latest={latestDraft}
              onStartNew={() => openWizard()}
              onResume={onResume}
              compact
            />
            <BookTemplateGallery onPick={openWizard} />

            {/* Library — the only scrollable region on the page */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {isLoading && items.length === 0 && (
                <div className="py-6 text-center text-sm text-gray-500">
                  Loading your library…
                </div>
              )}
              {!isLoading && items.length === 0 && <EmptyLibraryPill />}
              {drafts.length > 0 && (
                <LibraryRail title="In progress" emoji="✏️" books={drafts} quest />
              )}
              {published.length > 0 && (
                <LibraryRail title="Published" emoji="🎉" books={published} />
              )}
            </div>
          </section>

          {/* RIGHT — featured showcase, vertical variant */}
          <aside className="flex min-h-0 min-w-0 flex-col">
            <FeaturedBooksRail variant="vertical" />
          </aside>
        </main>
      </div>

      {/* BOOK-002 — creation mode chooser overlay. Shown above the library
          when the kid taps "New Book" / "Start your first book". Template
          gallery picks bypass this and go straight to the manual wizard. */}
      <AnimatePresence>
        {chooserOpen && (
          <BookCreationModeChooser
            key="creation-mode-chooser"
            onPick={handlePickMode}
            onCancel={() => setChooserOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Hero: "Continue …" if there's a draft; else "Start your first book" ─────

function HeroContinue({
  latest,
  onStartNew,
  onResume,
  compact = false,
}: {
  latest: BookListItem | null;
  onStartNew: () => void;
  onResume: (book: BookListItem) => void;
  /** Desktop hub-layout uses a shorter mascot + tighter padding so the hero
   *  doesn't eat the column's vertical budget. Mobile keeps the full hero. */
  compact?: boolean;
}) {
  // Mascot follows the standard precedence chain (authed kid → onboarding
  // profile → Pixie default) — never hardcode Koko on studio greetings.
  // Mirrors the Hub's HeroStage so the kid sees the same buddy everywhere.
  const { mascotId } = useResolvedIdentity();
  const hasDraft = latest !== null;
  const progressPct = hasDraft
    ? Math.min(100, Math.round((latest.pageCount / Math.max(1, latest.pageLimit)) * 100))
    : 0;
  const pagesLeft = hasDraft ? Math.max(0, latest.pageLimit - latest.pageCount) : 0;

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg bg-gradient-to-r from-brand-purple to-purple-600 shadow-glass ring-1 ring-white/10"
      style={{ minHeight: compact ? 140 : 196 }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[14%] top-1/2 h-[180px] w-[180px] -translate-y-1/2 rounded-full bg-white/25 blur-2xl" />
      </div>

      <div
        className={`relative flex h-full flex-col gap-4 ${
          compact ? 'p-4' : 'p-5 sm:p-6'
        } sm:flex-row sm:items-center sm:gap-5`}
      >
        <div className="flex shrink-0 items-center justify-center sm:flex-col">
          <div className="drop-shadow-2xl">
            <MascotAvatar id={mascotId} size={compact ? 'lg' : 'xl'} animate />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 backdrop-blur-sm ring-1 ring-white/20">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white">
              📖 Book Studio
            </span>
          </div>

          {hasDraft ? (
            <>
              <h1
                className={`font-display font-bold leading-tight text-white ${
                  compact ? 'text-lg' : 'text-xl sm:text-2xl'
                }`}
              >
                Continue{' '}
                <span className="bg-gradient-to-r from-amber-200 to-pink-200 bg-clip-text text-transparent">
                  {truncate(latest.title, 32)}
                </span>
              </h1>
              <div className="mt-2 max-w-md">
                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full bg-gradient-to-r from-amber-300 to-pink-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-medium text-white/80">
                  <span>
                    {latest.pageCount}/{latest.pageLimit} pages
                  </span>
                  <span>
                    {pagesLeft} page{pagesLeft === 1 ? '' : 's'} left
                  </span>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onResume(latest)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-md ring-1 ring-white/40 transition-transform hover:scale-[1.03]"
                >
                  <span className="font-display text-xs font-bold uppercase tracking-wide text-brand-purple">
                    Resume
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-brand-purple" strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={onStartNew}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm ring-1 ring-white/30 transition hover:bg-white/25"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Book
                </button>
              </div>
            </>
          ) : (
            <>
              <h1
                className={`font-display font-bold leading-tight text-white ${
                  compact ? 'text-lg' : 'text-xl sm:text-2xl'
                }`}
              >
                Turn your imagination into a real{' '}
                <span className="bg-gradient-to-r from-amber-200 to-pink-200 bg-clip-text text-transparent">
                  storybook
                </span>
              </h1>
              <p className="mt-1 text-xs text-white/75">
                Pick a kind of book, write your story, and download your finished book.
              </p>
              <button
                type="button"
                onClick={onStartNew}
                className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-1.5 shadow-md ring-1 ring-white/40 transition-transform hover:scale-[1.03]"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-purple" />
                <span className="font-display text-xs font-bold uppercase tracking-wide text-brand-purple">
                  Start your first book
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Author stats: 4 tiles ────────────────────────────────────────────────────

function AuthorStats({
  written,
  inProgress,
  published,
}: {
  written: number;
  inProgress: number;
  published: number;
}) {
  return (
    <div className="game-hud-frame game-glass shrink-0 rounded-lg p-3 shadow-glass">
      <div className="mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-brand-text-secondary">
        ✍️ Author Stats
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile value={written} label="Written" />
        <StatTile value={inProgress} label="In progress" accent="text-amber-600" />
        <StatTile value={published} label="Published" accent="text-emerald-600" />
        <StatTile
          value={0}
          label="Featured ⭐"
          accent="text-brand-primary"
          subtitle="Submit your best book"
        />
      </div>
    </div>
  );
}

function StatTile({
  value,
  label,
  accent,
  subtitle,
}: {
  value: number;
  label: string;
  accent?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg bg-white/60 p-2 ring-1 ring-white/80">
      <div className={`font-mono text-xl font-black leading-none ${accent ?? ''}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">
        {label}
      </div>
      {subtitle && (
        <div className="mt-0.5 text-[9px] leading-tight text-gray-400">{subtitle}</div>
      )}
    </div>
  );
}

// ── Library rail (horizontal scroll of compact BookTiles) ──────────────────

function LibraryRail({
  title,
  emoji,
  books,
  quest = false,
}: {
  title: string;
  emoji: string;
  books: BookListItem[];
  /** Show the "Today: write a page" quest pill in the section header. */
  quest?: boolean;
}) {
  return (
    <section className="shrink-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
          <span className="text-sm">{emoji}</span>
          {title}
          <span className="font-mono text-[10px] font-normal text-gray-400">
            {books.length}
          </span>
        </h2>
        {quest && <QuestPill />}
      </div>
      {/* Horizontal scroll matching the Template Gallery — same tile size,
          same padding, same scrollbar treatment. Negative margins + matching
          padding ensure hover shadows aren't clipped at the row edges. */}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {books.map((book) => (
          <BookRailTile key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}

/** Adapter that wraps the shared `BookTile` with book-specific visuals:
 *  cover image when available, theme-colored emoji fallback, status corner
 *  indicator. Kept here (not in the shared file) because the page-count
 *  formatting and status icon mapping is library-specific. */
function BookRailTile({ book }: { book: BookListItem }) {
  const typeCard = getBookTypeCard(book.type);
  const accent = typeCard?.suggestedThemeColor ?? '#5B5FFF';

  const thumbnail = book.coverThumbnail ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={book.coverThumbnail}
      alt={`Cover of ${book.title}`}
      className="h-full w-full object-cover"
    />
  ) : (
    <span className="text-5xl drop-shadow-sm">{typeCard?.emoji ?? '📖'}</span>
  );

  // BOOK-003 — for published books, the effort badge replaces the corner
  // status icon (it conveys "published" implicitly + the kid's effort).
  // Drafts keep the lock icon.
  const corner =
    book.status === 'published' && book.effortBadge ? (
      <EffortBadge badge={book.effortBadge} size="sm" showTooltip={false} />
    ) : book.status === 'published' ? (
      <div className="rounded-full bg-white/95 p-1 shadow-sm">
        <BookOpen className="h-3 w-3 text-indigo-600" />
      </div>
    ) : book.status === 'draft' ? (
      <div className="rounded-full bg-white/95 p-1 shadow-sm">
        <Lock className="h-3 w-3 text-gray-500" />
      </div>
    ) : null;

  // BOOK-008 — a book still generating renders a NON-clickable progress tile
  // (no href/onClick → BookTile's plain-div mode), gating entry until it's done.
  const gen = book.generation;
  if (gen && (gen.status === 'pending' || gen.status === 'generating')) {
    const pct =
      gen.step === 'images' && gen.pagesTotal > 0
        ? Math.max(8, Math.round((gen.pagesRendered / gen.pagesTotal) * 100))
        : gen.step === 'anchor'
          ? 35
          : gen.step === 'drafting'
            ? 18
            : 6;
    const label =
      gen.status === 'pending' || gen.step === 'queued'
        ? 'Getting ready…'
        : gen.step === 'drafting'
          ? 'Thinking up your story…'
          : gen.step === 'anchor'
            ? 'Designing your hero…'
            : gen.step === 'images'
              ? `Drawing ${gen.pagesRendered}/${gen.pagesTotal}…`
              : 'Almost done…';
    return (
      <BookTile
        thumbnail={
          <div className="relative flex h-full w-full items-center justify-center">
            <span className="animate-pulse text-5xl drop-shadow-sm">{typeCard?.emoji ?? '📖'}</span>
            <Sparkles className="absolute right-2 top-2 h-4 w-4 animate-pulse text-amber-500" />
            <div className="absolute bottom-2 left-2 right-2 h-1.5 overflow-hidden rounded-full bg-white/60">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        }
        thumbnailBackground={`linear-gradient(135deg, ${accent}26, ${accent}10), ${accent}1f`}
        title={book.title}
        subtitle={label}
        ariaLabel={`${book.title} — generating`}
      />
    );
  }

  return (
    <BookTile
      thumbnail={thumbnail}
      thumbnailBackground={
        book.coverThumbnail
          ? undefined
          : `linear-gradient(135deg, ${accent}26, ${accent}10), ${accent}1f`
      }
      title={book.title}
      subtitle={`${book.pageCount}/${book.pageLimit} pages`}
      corner={corner}
      href={`/create/book/${book.id}`}
    />
  );
}

// ── Today's quest pill ──────────────────────────────────────────────────────

function QuestPill() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-2.5 py-1 ring-1 ring-amber-300/50">
      <Zap className="h-3 w-3 text-amber-600" />
      <span className="text-[10px] font-semibold text-amber-800">
        Today: write a page
      </span>
      <span className="font-mono text-[10px] font-bold text-amber-700">+20</span>
    </div>
  );
}

// ── Empty library pill ──────────────────────────────────────────────────────
//
// Replaces the old centered "Your library is empty" card. Per the
// Google-Docs reference: the template gallery above is the primary "start a
// new book" surface, so this just acknowledges the empty state with one
// friendly line — no competing big CTA.

function EmptyLibraryPill() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-lg bg-white/60 px-4 py-3 text-center text-sm text-gray-600 ring-1 ring-white/80">
      <span className="text-lg">📚</span>
      <span>
        <span className="font-semibold text-gray-800">Your library is empty.</span>{' '}
        Pick a kind of book above to start your first one.
      </span>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function DecorativeSparkles() {
  return (
    <>
      <div className="pointer-events-none absolute right-8 top-12 select-none text-yellow-300 opacity-40">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="pointer-events-none absolute left-12 top-32 select-none text-purple-300 opacity-30">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="pointer-events-none absolute right-20 top-44 select-none text-pink-300 opacity-30">
        <Sparkles className="h-5 w-5" />
      </div>
    </>
  );
}

function pickLatest(books: BookListItem[]): BookListItem | null {
  if (books.length === 0) return null;
  return (
    [...books].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0] ?? null
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
