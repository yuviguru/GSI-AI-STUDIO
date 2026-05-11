'use client';

import { motion } from 'framer-motion';
import { PerformanceCard } from './PerformanceCard';
import type { PerformanceFeedItem } from '@/types/performance.types';

interface PerformanceGridProps {
  items: PerformanceFeedItem[];
  loading: boolean;
  hasMore: boolean;
  isMine?: boolean;
  onLoadMore: () => void;
  onDelete?: (id: string) => void;
  emptyState?: React.ReactNode;
}

export function PerformanceGrid({
  items,
  loading,
  hasMore,
  isMine,
  onLoadMore,
  onDelete,
  emptyState,
}: PerformanceGridProps) {
  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-brand-purple/5 px-6 py-12 text-center">
        {emptyState ?? (
          <>
            <span className="text-5xl">🎤</span>
            <p className="text-lg font-bold text-brand-purple">
              No performances yet
            </p>
            <p className="text-sm text-gray-600">
              Try Sing-Along on a song to record your voice!
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {items.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <PerformanceCard
              performance={p}
              isMine={isMine}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-full border-2 border-brand-purple bg-white px-6 py-2 font-bold text-brand-purple transition-all hover:bg-brand-purple/5 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
