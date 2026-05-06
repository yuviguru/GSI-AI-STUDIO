'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { FlipbookPreview } from '@/components/studios/book/FlipbookPreview';
import type { Book, BookPage } from '@/types/book.types';

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
  return {
    ...b,
    createdAt: new Date(b.createdAt),
    updatedAt: new Date(b.updatedAt),
    publishedAt: b.publishedAt ? new Date(b.publishedAt) : null,
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
