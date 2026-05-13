import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedBookBySlug } from '@gsi/firebase/bookService';
import { PublicBookViewer } from './PublicBookViewer';

interface BookViewPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: BookViewPageProps): Promise<Metadata> {
  try {
    const result = await getPublishedBookBySlug(params.slug);
    if (!result) {
      return {
        title: 'Book Not Found — GSI AI Studio',
        description: 'This book may have been removed or is no longer published.',
      };
    }
    const { book } = result;
    return {
      title: `${book.title} — GSI AI Studio`,
      description: `A book by ${book.author} on GSI AI Studio.`,
      openGraph: {
        title: `${book.title} ✨`,
        description: `Check out this book by ${book.author}, made on GSI AI Studio!`,
        images: book.coverThumbnail
          ? [{ url: book.coverThumbnail, width: 600, height: 800 }]
          : [],
        type: 'article',
      },
    };
  } catch {
    return {
      title: 'Book Not Found — GSI AI Studio',
      description: 'This book may have been removed.',
    };
  }
}

export default async function PublicBookPage({ params }: BookViewPageProps) {
  const result = await getPublishedBookBySlug(params.slug);

  if (!result) {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <span className="text-5xl">📕</span>
        <h1 className="mt-4 font-display text-2xl font-bold text-gray-900">Book Not Found</h1>
        <p className="mt-2 max-w-sm text-gray-500">
          This book may have been removed, unpublished, or the link may be incorrect.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-brand-purple px-8 py-3 font-bold text-white transition-all hover:shadow-lg active:scale-95"
        >
          Make your own book →
        </Link>
      </main>
    );
  }

  const { book, pages } = result;

  // Serialize dates for client component
  const serialized = {
    book: {
      ...book,
      publishedAt:
        book.publishedAt instanceof Date ? book.publishedAt.toISOString() : null,
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
    },
    pages: pages.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };

  return <PublicBookViewer payload={serialized} />;
}
