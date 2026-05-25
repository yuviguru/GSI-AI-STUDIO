'use client';

import { ArrowRight } from 'lucide-react';

/**
 * Static seed entries for the Featured rail.
 *
 * TODO(curation-pipeline): replace with a real Firestore-backed query once
 * we have an editorial flow that flags books as featured. For now this is
 * a showcase placeholder so the rail isn't empty — kids see what "featured"
 * looks like and what to aim for. The shape mirrors `BookListItem` enough
 * that we can swap data sources without changing this component.
 */
interface FeaturedEntry {
  id: string;
  title: string;
  author: string;
  emoji: string;
  bg: string;
  ring: string;
}

/** Horizontal: scrolling rail under the library (mobile + the old desktop).
 *  Vertical: stacked-card column for the right side of the desktop hub-style
 *  layout — fits 3–4 books visible without scrolling the page. */
type FeaturedVariant = 'horizontal' | 'vertical';

const FEATURED_SEED: FeaturedEntry[] = [
  {
    id: 'seed-1',
    title: 'The Brave Cat',
    author: 'Aanya, 9',
    emoji: '🐱',
    bg: 'from-amber-200 to-orange-200',
    ring: 'ring-amber-300/60',
  },
  {
    id: 'seed-2',
    title: 'My Goa Trip',
    author: 'Vihaan, 11',
    emoji: '🏖️',
    bg: 'from-sky-200 to-cyan-200',
    ring: 'ring-sky-300/60',
  },
  {
    id: 'seed-3',
    title: 'Robot Friends',
    author: 'Riya, 10',
    emoji: '🤖',
    bg: 'from-violet-200 to-fuchsia-200',
    ring: 'ring-violet-300/60',
  },
  {
    id: 'seed-4',
    title: 'Grandma’s Kitchen',
    author: 'Karthik, 12',
    emoji: '🍛',
    bg: 'from-rose-200 to-pink-200',
    ring: 'ring-rose-300/60',
  },
  {
    id: 'seed-5',
    title: 'Space Diary',
    author: 'Meera, 13',
    emoji: '🚀',
    bg: 'from-indigo-200 to-purple-200',
    ring: 'ring-indigo-300/60',
  },
];

interface FeaturedBooksRailProps {
  variant?: FeaturedVariant;
}

export function FeaturedBooksRail({ variant = 'horizontal' }: FeaturedBooksRailProps) {
  if (variant === 'vertical') {
    return <VerticalRail />;
  }
  return <HorizontalRail />;
}

function HorizontalRail() {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
          <span className="text-base">⭐</span>
          Featured this week
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:underline"
          aria-label="See all featured books (coming soon)"
        >
          See all <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FEATURED_SEED.map((entry) => (
          <FeaturedCard key={entry.id} entry={entry} variant="horizontal" />
        ))}
      </div>
    </section>
  );
}

/** Vertical: a column of compact "cover + caption" rows. Designed for the
 *  desktop right-rail in the hub-style layout — fits 3–4 entries without
 *  scrolling, scrolls within itself for the rest.
 *
 *  Padding notes: the outer wrapper uses `p-3` for the card chrome, and the
 *  inner scroll list uses `px-1 py-1` so each card's `ring-1` doesn't get
 *  clipped against the rounded frame edge or the scrollbar gutter. */
function VerticalRail() {
  return (
    <div className="game-hud-frame game-glass flex min-h-0 flex-1 flex-col rounded-lg p-3 shadow-glass">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div className="font-display text-[11px] font-bold uppercase tracking-wider">
          ⭐ Featured this week
        </div>
        <button
          type="button"
          className="text-[10px] font-semibold text-brand-primary hover:underline"
          aria-label="See all featured books (coming soon)"
        >
          All →
        </button>
      </div>

      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 py-1 [scrollbar-width:thin]">
        {FEATURED_SEED.map((entry) => (
          <FeaturedCard key={entry.id} entry={entry} variant="vertical" />
        ))}
      </div>
    </div>
  );
}

function FeaturedCard({
  entry,
  variant,
}: {
  entry: FeaturedEntry;
  variant: FeaturedVariant;
}) {
  if (variant === 'vertical') {
    // `shrink-0` would force the card to overflow the column when content is
    // narrow — instead let it fill the column width and shrink as needed.
    return (
      <div
        className={`flex w-full items-center gap-2.5 overflow-hidden rounded-lg bg-white/80 p-2 ring-1 ${entry.ring} transition-transform hover:scale-[1.01]`}
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${entry.bg} text-2xl`}
        >
          {entry.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-[11px] font-bold text-gray-900">
            {entry.title}
          </div>
          <div className="text-[10px] text-gray-500">by {entry.author}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-lg ring-1 ${entry.ring} shadow-card transition-transform hover:scale-[1.02]`}
      style={{ width: 156 }}
    >
      <div
        className={`flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br ${entry.bg} text-5xl`}
      >
        {entry.emoji}
      </div>
      <div className="bg-white px-3 py-2">
        <div className="line-clamp-1 text-xs font-bold text-gray-900">
          {entry.title}
        </div>
        <div className="text-[10px] text-gray-500">by {entry.author}</div>
      </div>
    </div>
  );
}
