'use client';

import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useBookList } from '@/hooks/useBookList';
import { Mascot } from '@/components/mascot/Mascot';
import { BookCard } from './BookCard';
import { NewBookWizard } from './NewBookWizard';

type View = 'library' | 'wizard';

export function BookStudioClient() {
  const [view, setView] = useState<View>('library');
  const { items, isLoading, error } = useBookList();

  const drafts = items.filter((b) => b.status === 'draft' || b.status === 'complete');
  const published = items.filter((b) => b.status === 'published');

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-purple-50 px-4 py-4">
      {/* Decorative sparkles in background */}
      <div className="pointer-events-none absolute right-8 top-12 select-none text-yellow-300 opacity-40">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="pointer-events-none absolute left-12 top-32 select-none text-purple-300 opacity-30">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="pointer-events-none absolute right-20 top-44 select-none text-pink-300 opacity-30">
        <Sparkles className="h-5 w-5" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        {view === 'library' ? (
          <>
            {/* Hero header with Koko */}
            <div className="mb-6 flex items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <Mascot expression="celebrating" size="md" bobbing />
                <div>
                  <h1 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl">
                    Book Studio
                  </h1>
                  <p className="mt-0.5 text-sm text-gray-600">
                    Turn your imagination into a real storybook
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setView('wizard')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-gradient-to-r from-brand-purple to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-button transition-transform hover:scale-105"
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
              <div className="py-16 text-center text-sm text-gray-500">
                Loading your library…
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <EmptyState onStart={() => setView('wizard')} />
            )}

            {drafts.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
                  <span className="text-base">✏️</span>
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
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
                  <span className="text-base">🎉</span>
                  Published
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {published.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <NewBookWizard onClose={() => setView('library')} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative rounded-3xl bg-white p-10 text-center shadow-card">
      {/* Decorative elements */}
      <div className="absolute left-6 top-6 text-2xl opacity-50">⭐</div>
      <div className="absolute right-8 top-8 text-xl opacity-40">✨</div>
      <div className="absolute bottom-6 left-10 text-xl opacity-40">🌟</div>

      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-4xl shadow-inner">
        📖
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-gray-900">
        Your book begins here
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        Pick a kind of book, make up to 3 characters that&apos;ll show up the same on
        every page, write your story (or speak it!), and download your finished book.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-purple to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-button transition-transform hover:scale-105"
      >
        <Sparkles className="h-4 w-4" />
        Start your first book
      </button>
    </div>
  );
}
