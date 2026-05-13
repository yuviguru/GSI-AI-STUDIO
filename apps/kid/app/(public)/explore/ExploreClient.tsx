'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExplore, type ExploreSort } from '@/hooks/useExplore';
import { usePerformances } from '@/hooks/usePerformances';
import { CreationFilters } from '@/components/creation/CreationFilters';
import { CreationGrid } from '@/components/creation/CreationGrid';
import { GalleryTabs, type GalleryTab } from '@/components/creation/GalleryTabs';
import { PerformanceGrid } from '@/components/creation/PerformanceGrid';
import { FeaturedSection } from '@/components/explore/FeaturedSection';
import { Leaderboard } from '@/components/explore/Leaderboard';
import { cn } from '@/lib/utils';
import type { CreationType } from '@gsi/types';

const sortOptions: Array<{ value: ExploreSort; label: string }> = [
  { value: 'trending', label: 'Trending 🔥' },
  { value: 'newest', label: 'Newest ⚡' },
];

export function ExploreClient() {
  const [tab, setTab] = useState<GalleryTab>('creations');

  const {
    creations,
    loading: creationsLoading,
    error: creationsError,
    hasMore: creationsHasMore,
    loadMore: loadMoreCreations,
    filter,
    setFilter,
    sort,
    setSort,
  } = useExplore();

  // Performances feed mirrors the same sort/filter — but only the parent
  // creation type filter applies (story/music/quiz/game/comic).
  const {
    performances,
    loading: performancesLoading,
    error: performancesError,
    hasMore: performancesHasMore,
    loadMore: loadMorePerformances,
  } = usePerformances({
    mode: 'public',
    sort,
    parentCreationType: filter ?? undefined,
  });

  const handleShare = useCallback((id: string) => {
    const url = `${window.location.origin}/view/${id}`;
    if (navigator.share) {
      navigator.share({ title: 'Check out this creation!', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
    }
  }, []);

  const error = tab === 'creations' ? creationsError : performancesError;

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center">
          <span className="text-5xl">🌍</span>
          <h1 className="mt-4 font-display text-3xl font-bold text-gray-900">
            Explore
          </h1>
          <p className="mt-2 text-gray-600">See what others are creating</p>
        </div>

        {/* Featured + Leaderboard — only on creations tab */}
        {tab === 'creations' && (
          <>
            <div className="mt-6">
              <FeaturedSection />
            </div>
            <div className="mt-4">
              <Leaderboard />
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="mt-6 flex justify-center">
          <GalleryTabs active={tab} onChange={setTab} />
        </div>

        {/* Filter + Sort controls (shared between tabs) */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            <CreationFilters
              active={filter}
              onFilterChange={(type: CreationType | null) => setFilter(type)}
            />
          </div>
          <SortToggle value={sort} onChange={setSort} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Tab body */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${tab}-${filter ?? 'all'}-${sort}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'creations' ? (
                <CreationGrid
                  items={creations}
                  loading={creationsLoading}
                  hasMore={creationsHasMore}
                  onLoadMore={loadMoreCreations}
                  onShare={handleShare}
                />
              ) : (
                <PerformanceGrid
                  items={performances}
                  loading={performancesLoading}
                  hasMore={performancesHasMore}
                  onLoadMore={loadMorePerformances}
                  emptyState={
                    <>
                      <span className="text-5xl">🎤</span>
                      <p className="text-lg font-bold text-brand-purple">
                        No performances yet
                      </p>
                      <p className="text-sm text-gray-600">
                        Be the first to record a sing-along!
                      </p>
                    </>
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SortToggle({
  value,
  onChange,
}: {
  value: ExploreSort;
  onChange: (sort: ExploreSort) => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-full border border-gray-200 bg-gray-100 p-0.5">
      {sortOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
            value === option.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
