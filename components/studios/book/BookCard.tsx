'use client';

import Link from 'next/link';
import { BookOpen, Lock } from 'lucide-react';
import type { BookListItem } from '@/types/book.types';
import { getBookTypeCard } from '@/lib/templates/bookTemplates';

interface BookCardProps {
  book: BookListItem;
}

const STATUS_LABELS: Record<BookListItem['status'], string> = {
  draft: 'In progress',
  complete: 'Ready to publish',
  published: 'Published',
};

const STATUS_COLORS: Record<BookListItem['status'], string> = {
  draft: 'bg-amber-100 text-amber-800',
  complete: 'bg-emerald-100 text-emerald-800',
  published: 'bg-indigo-100 text-indigo-800',
};

export function BookCard({ book }: BookCardProps) {
  const typeCard = getBookTypeCard(book.type);
  const accent = typeCard?.suggestedThemeColor ?? '#5B5FFF';

  return (
    <Link
      href={`/create/book/${book.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all hover:scale-[1.02] hover:shadow-elevated"
    >
      <div
        className="relative aspect-[3/4] w-full overflow-hidden"
        style={{ backgroundColor: accent }}
      >
        {book.coverThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverThumbnail}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">
            {typeCard?.emoji ?? '📖'}
          </div>
        )}
        {book.status === 'published' && (
          <div className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5">
            <BookOpen className="h-4 w-4 text-indigo-600" />
          </div>
        )}
        {book.status === 'draft' && (
          <div className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5">
            <Lock className="h-4 w-4 text-gray-500" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-brand-purple">
          {book.title}
        </h3>
        <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
          <span>
            {book.pageCount} / {book.pageLimit} pages
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[book.status]}`}>
            {STATUS_LABELS[book.status]}
          </span>
        </div>
      </div>
    </Link>
  );
}
