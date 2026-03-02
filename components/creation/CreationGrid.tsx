'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { CreationCard } from './CreationCard';
import type { Creation } from '@/types/creation.types';

interface CreationGridProps {
  items: Creation[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CreationGrid({
  items,
  loading,
  hasMore,
  onLoadMore,
  onShare,
  onDelete,
}: CreationGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll via IntersectionObserver
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasMore && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, onLoadMore]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  // Loading skeleton state
  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
        <span className="text-4xl">🚀</span>
        <p className="mt-3 font-display text-base font-bold text-gray-700">
          No creations yet!
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Your AI masterpieces will show up here.
        </p>
        <Link
          href="/create/story"
          className="mt-5 inline-flex rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition-transform hover:scale-105 active:scale-95"
        >
          Create Your First Story
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {items.map((creation) => (
          <CreationCard
            key={creation.id}
            creation={creation}
            onShare={onShare}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading more indicator */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
        </div>
      )}
    </>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-md">
      <div className="aspect-[4/3] w-full bg-gray-200" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  );
}
