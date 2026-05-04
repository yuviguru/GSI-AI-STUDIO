'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Plus } from 'lucide-react';
import { useBookList } from '@/hooks/useBookList';
import { BookCard } from './BookCard';
import { NewBookWizard } from './NewBookWizard';

export function BookStudioClient() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { items, isLoading, error } = useBookList();

  const drafts = items.filter((b) => b.status === 'draft' || b.status === 'complete');
  const published = items.filter((b) => b.status === 'published');

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50 px-4 py-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-purple"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-brand-purple" />
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">Book Studio</h1>
              <p className="text-sm text-gray-500">Write your own books — AI helps with grammar &amp; pictures</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-brand-purple/90"
          >
            <Plus className="h-4 w-4" />
            New Book
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading && items.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-500">Loading your library…</div>
        )}

        {!isLoading && items.length === 0 && (
          <EmptyState onStart={() => setWizardOpen(true)} />
        )}

        {drafts.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
              In progress
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {drafts.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}

        {published.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
              Published
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {published.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}
      </div>

      {wizardOpen && <NewBookWizard onClose={() => setWizardOpen(false)} />}
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-3xl bg-white p-10 text-center shadow-card">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-purple/10 text-3xl">
        📖
      </div>
      <h2 className="mt-4 text-xl font-bold text-gray-900">Your book begins here</h2>
      <p className="mt-2 text-sm text-gray-600">
        Pick a type, write your story, generate illustrations, and download your finished book as a PDF.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-brand-purple/90"
      >
        <Plus className="h-4 w-4" />
        Start your first book
      </button>
    </div>
  );
}
