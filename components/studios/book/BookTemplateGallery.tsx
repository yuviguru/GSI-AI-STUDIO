'use client';

import { Plus } from 'lucide-react';
import type { BookType } from '@gsi/types';
import { BOOK_TYPE_CARDS } from '@/lib/templates/bookTemplates';
import { BookTile } from '@/components/studios/shared/BookTile';

interface BookTemplateGalleryProps {
  /** Called when the kid picks a template. Pass the `BookType` to deep-link
   *  into the wizard with that type pre-selected, or `undefined` for the
   *  "Blank book" card which opens the wizard at the type-picker step. */
  onPick: (type?: BookType) => void;
}

/**
 * "Start a new book" template gallery — Google-Docs-style horizontal row of
 * book-type entry points shown above the library.
 *
 * Always visible (not just on empty state) so a kid can spin up a new book
 * from the home page without scrolling to find the wizard CTA. Inspired by
 * Google Docs' "Start a new document" pattern, adapted for the 18 kid book
 * types in `BOOK_TYPE_CARDS`.
 *
 * Shows the 6 most kid-popular types alongside a leading "Blank book" card.
 * The full 18-type picker is one click away via the "All book types" link
 * (and the wizard's step 1 already exposes them all).
 *
 * Cards are rendered with the shared `BookTile` component so they're visually
 * identical to the library book cards in the rails below — same width,
 * border radius, hover, and caption shape.
 */

/** Curated short-list of book types to surface as templates. Order matters —
 *  this is the order kids see. Keeping the list at 6 means the row fits a
 *  laptop screen alongside the leading "Blank book" card without scrolling.
 *  All 18 types remain accessible via the wizard's type picker. */
const POPULAR_TYPES: BookType[] = [
  'storybook',
  'picture_book',
  'about_me',
  'recipe',
  'diary',
  'poem',
];

export function BookTemplateGallery({ onPick }: BookTemplateGalleryProps) {
  const popular = POPULAR_TYPES.map((t) =>
    BOOK_TYPE_CARDS.find((c) => c.type === t),
  ).filter((c): c is (typeof BOOK_TYPE_CARDS)[number] => c !== undefined);

  return (
    <section className="game-hud-frame game-glass shrink-0 rounded-lg p-3 shadow-glass sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-display text-[11px] font-bold uppercase tracking-wider text-brand-text-secondary">
          Start a new book
        </h2>
        <button
          type="button"
          onClick={() => onPick()}
          className="text-[11px] font-semibold text-brand-primary hover:underline"
        >
          All book types →
        </button>
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <BookTile
          thumbnail={
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-button ring-1 ring-gray-200 transition-colors group-hover:bg-brand-purple group-hover:ring-brand-purple">
              <Plus
                className="h-7 w-7 text-brand-purple transition-colors group-hover:text-white"
                strokeWidth={2.5}
              />
            </div>
          }
          thumbnailBackground="linear-gradient(135deg, #f9fafb, #f3f4f6)"
          title="Blank book"
          subtitle="Pick everything yourself"
          onClick={() => onPick()}
          ariaLabel="Start a blank book"
        />

        {popular.map((card) => (
          <BookTile
            key={card.type}
            thumbnail={<span className="text-5xl drop-shadow-sm">{card.emoji}</span>}
            // Soft tint of the suggested theme color with a white overlay so
            // the emoji remains legible on any underlying hue.
            thumbnailBackground={`linear-gradient(135deg, ${card.suggestedThemeColor}26, ${card.suggestedThemeColor}10), linear-gradient(180deg, #ffffff80, #ffffff00), ${card.suggestedThemeColor}14`}
            title={card.label}
            subtitle={card.description}
            onClick={() => onPick(card.type)}
            ariaLabel={`Start a ${card.label.toLowerCase()}`}
          />
        ))}
      </div>
    </section>
  );
}
