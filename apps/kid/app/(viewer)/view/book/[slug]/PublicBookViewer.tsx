'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { FlipbookPreview } from '@/components/studios/book/FlipbookPreview';
import { EffortBadge } from '@/components/studios/book/EffortBadge';
import type { Book, BookPage, EffortBadge as EffortBadgeData } from '@gsi/types';

interface SerializedBook extends Omit<Book, 'createdAt' | 'updatedAt' | 'publishedAt'> {
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface SerializedPage extends Omit<BookPage, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

interface PublicBookViewerProps {
  payload: {
    book: SerializedBook;
    pages: SerializedPage[];
  };
}

function reviveBook(b: SerializedBook): Book {
  // BOOK-003 — effortBadge has its own Date field that needs reviving when
  // it round-trips through JSON. Older books (pre-BOOK-003) will have null.
  const badge = b.effortBadge as unknown;
  let effortBadge: EffortBadgeData | null = null;
  if (badge && typeof badge === 'object') {
    const e = badge as Record<string, unknown>;
    effortBadge = {
      key: e.key as EffortBadgeData['key'],
      aiPercentage: e.aiPercentage as number,
      awardedAt: typeof e.awardedAt === 'string' ? new Date(e.awardedAt) : new Date(),
      breakdown: e.breakdown as EffortBadgeData['breakdown'],
    };
  }
  return {
    ...b,
    createdAt: new Date(b.createdAt),
    updatedAt: new Date(b.updatedAt),
    publishedAt: b.publishedAt ? new Date(b.publishedAt) : null,
    effortBadge,
  };
}

function revivePage(p: SerializedPage): BookPage {
  return {
    ...p,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  };
}

export function PublicBookViewer({ payload }: PublicBookViewerProps) {
  const book = reviveBook(payload.book);
  const pages = payload.pages.map(revivePage);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 text-center">
          <h1 className="font-display text-2xl font-bold text-gray-900">{book.title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            By {book.author} • Published on GSI AI Studio
          </p>
          {book.effortBadge && (
            <div className="mt-3 flex justify-center">
              <EffortBadge badge={book.effortBadge} size="lg" />
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-card">
          <FlipbookPreview book={book} pages={pages} readOnly />
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 text-center shadow-card">
          <Sparkles className="mx-auto h-6 w-6 text-brand-purple" />
          <p className="mt-2 text-sm font-semibold text-gray-900">
            Want to make your own book?
          </p>
          <Link
            href="/create/book"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-brand-purple/90"
          >
            Start writing →
          </Link>
        </div>
      </div>
    </div>
  );
}
