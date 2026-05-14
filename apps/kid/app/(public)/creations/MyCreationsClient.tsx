'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreations } from '@/hooks/useCreations';
import { usePerformances } from '@/hooks/usePerformances';
import { CreationFilters } from '@/components/creation/CreationFilters';
import { CreationGrid } from '@/components/creation/CreationGrid';
import { GalleryTabs, type GalleryTab } from '@/components/creation/GalleryTabs';
import { PerformanceGrid } from '@/components/creation/PerformanceGrid';
import type { CreationType } from '@gsi/types';

export function MyCreationsClient() {
  const [tab, setTab] = useState<GalleryTab>('creations');
  const [filter, setFilter] = useState<CreationType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [perfDeleteTarget, setPerfDeleteTarget] = useState<string | null>(null);

  const {
    creations,
    loading: creationsLoading,
    error: creationsError,
    hasMore: creationsHasMore,
    loadMore: loadMoreCreations,
    deleteCreation,
  } = useCreations(filter);

  const {
    performances,
    loading: performancesLoading,
    error: performancesError,
    hasMore: performancesHasMore,
    loadMore: loadMorePerformances,
    deletePerformance,
  } = usePerformances({ mode: 'mine' });

  const handleShare = useCallback((id: string) => {
    const url = `${window.location.origin}/view/${id}`;
    if (navigator.share) {
      navigator.share({ title: 'Check out my creation!', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
    }
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteCreation(deleteTarget);
    } catch {
      // Error already handled by hook (reverts optimistic update)
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteCreation]);

  const handlePerfDeleteConfirm = useCallback(async () => {
    if (!perfDeleteTarget) return;
    try {
      await deletePerformance(perfDeleteTarget);
    } catch {
      // Error already handled by hook
    }
    setPerfDeleteTarget(null);
  }, [perfDeleteTarget, deletePerformance]);

  const error = tab === 'creations' ? creationsError : performancesError;

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center">
          <span className="text-5xl">{tab === 'creations' ? '✨' : '🎤'}</span>
          <h1 className="mt-4 font-display text-3xl font-bold text-gray-900">
            My Creations
          </h1>
          <p className="mt-2 text-gray-600">
            {tab === 'creations'
              ? "Everything you've made with AI lives here"
              : "All the songs you've sung along to"}
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex justify-center">
          <GalleryTabs active={tab} onChange={setTab} />
        </div>

        {/* Filter chips — only on creations tab */}
        {tab === 'creations' && (
          <div className="mt-6">
            <CreationFilters active={filter} onFilterChange={setFilter} />
          </div>
        )}

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
              key={`${tab}-${filter ?? 'all'}`}
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
                  onDelete={(id) => setDeleteTarget(id)}
                />
              ) : (
                <PerformanceGrid
                  items={performances}
                  loading={performancesLoading}
                  hasMore={performancesHasMore}
                  onLoadMore={loadMorePerformances}
                  isMine
                  onDelete={(id) => setPerfDeleteTarget(id)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Creation delete dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="text-center">
                <span className="text-4xl">🗑️</span>
                <h2 className="mt-3 font-display text-lg font-bold text-gray-900">
                  Delete this creation?
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Are you sure? This can&apos;t be undone!
                </p>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
                >
                  Keep it
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance delete dialog */}
      <AnimatePresence>
        {perfDeleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setPerfDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="text-center">
                <span className="text-4xl">🎤</span>
                <h2 className="mt-3 font-display text-lg font-bold text-gray-900">
                  Delete this performance?
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Your recording will be removed for good.
                </p>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setPerfDeleteTarget(null)}
                  className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
                >
                  Keep it
                </button>
                <button
                  onClick={handlePerfDeleteConfirm}
                  className="flex-1 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
