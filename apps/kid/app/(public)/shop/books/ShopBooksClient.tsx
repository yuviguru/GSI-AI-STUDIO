'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, ShoppingBag, Sparkles } from 'lucide-react';
import { EffortBadge } from '@/components/studios/book/EffortBadge';
import type { EffortBadge as EffortBadgeData } from '@gsi/types';

interface ShopBookItem {
  id: string;
  title: string;
  author: string;
  coverThumbnail: string | null;
  priceInr: number;
  effortBadge: EffortBadgeData | null;
  listedAt: string;
  shareUrl: string | null;
}

interface ApiResponse {
  success: boolean;
  data: { items: ShopBookItem[]; nextCursor: string | null; hasMore: boolean };
}

const fetcher = async (url: string): Promise<ShopBookItem[]> => {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse;
  if (!json.success) throw new Error('Could not load the shop');
  return json.data?.items ?? [];
};

export function ShopBooksClient() {
  const { data, error, isLoading } = useSWR<ShopBookItem[]>('/api/shop/books?limit=24', fetcher);
  const items = data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to studio
          </Link>
        </div>

        <header className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
            <ShoppingBag className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900">GSI Bookshop</h1>
          <p className="mx-auto mt-1 max-w-xl text-sm text-gray-600">
            Every book here was written by a kid. Part of every sale supports{' '}
            <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
              <Heart className="h-3 w-3" />
              KIT
            </span>{' '}
            — helping kids who don&apos;t have books.
          </p>
        </header>

        <div className="mb-5 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 px-4 py-3 text-center text-xs text-amber-800">
          🛠️ The Buy button opens soon. Browse what kids are listing, share with their
          fans, and we&apos;ll flip it live as the shop launches.
        </div>

        {isLoading && (
          <div className="py-12 text-center text-sm text-gray-500">Loading the shelf…</div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load the shop. Try again later.
          </div>
        )}
        {!isLoading && !error && items.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-amber-100">
            <Sparkles className="mx-auto h-8 w-8 text-amber-500" />
            <h2 className="mt-2 font-display text-lg font-bold text-gray-900">
              No books yet
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              The shelf is empty for now. Be one of the first authors —{' '}
              <Link href="/create/book" className="font-semibold text-amber-700 hover:underline">
                start your book
              </Link>{' '}
              and turn on sales when you publish.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((b) => (
              <ShopBookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopBookCard({ book }: { book: ShopBookItem }) {
  const accent = book.coverThumbnail ? undefined : '#F59E0B';
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-amber-100"
    >
      <Link
        href={book.shareUrl ?? '#'}
        className="block aspect-[3/4] w-full"
        aria-label={`Preview ${book.title}`}
      >
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background: book.coverThumbnail
              ? undefined
              : `linear-gradient(135deg, ${accent}26, ${accent}10), ${accent}1f`,
          }}
        >
          {book.coverThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverThumbnail}
              alt={`Cover of ${book.title}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-5xl">📖</span>
          )}
        </div>
      </Link>
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-sm font-bold text-gray-900">{book.title}</h3>
            <p className="line-clamp-1 text-[11px] text-gray-500">by {book.author}</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-700">
            ₹{book.priceInr}
          </span>
        </div>
        {book.effortBadge && (
          <div className="mt-2">
            <EffortBadge badge={book.effortBadge} size="sm" showTooltip={false} />
          </div>
        )}
        <button
          type="button"
          disabled
          className="mt-2 w-full cursor-not-allowed rounded-lg bg-gray-100 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500"
        >
          Buy · Coming Soon
        </button>
      </div>
    </motion.div>
  );
}
