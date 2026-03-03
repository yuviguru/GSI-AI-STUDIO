'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StoryPageView } from './StoryPageView';
import { AiXrayPopup } from '@/components/learning/AiXrayPopup';
import { ShareButton } from '@/components/shared/ShareButton';
import { DownloadButton } from '@/components/shared/DownloadButton';
import type { AiXrayData } from '@/types';
import type { StoryContent } from '@/types/creation.types';

interface StoryViewerProps {
  story: {
    title: string;
    pages: Array<{ pageNumber: number; text: string; imageUrl: string }>;
    genre: string;
    characters: string[];
    moral: string;
  };
  aiXray: AiXrayData;
  onCreateAnother: () => void;
  creationId?: string;
  readOnly?: boolean;
}

export function StoryViewer({ story, aiXray, onCreateAnother, creationId, readOnly = false }: StoryViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showXray, setShowXray] = useState(false);

  // Auto-show X-Ray on first creation per session (skip in readOnly mode)
  useEffect(() => {
    if (readOnly) return;
    const key = 'gsi-xray-shown-story';
    if (!sessionStorage.getItem(key)) {
      setShowXray(true);
      sessionStorage.setItem(key, 'true');
    }
  }, [readOnly]);

  const totalPages = story.pages.length;

  const goToPage = useCallback((next: number) => {
    if (next < 0 || next >= totalPages) return;
    setDirection(next > currentPage ? 1 : -1);
    setCurrentPage(next);
  }, [currentPage, totalPages]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -50 && currentPage < totalPages - 1) goToPage(currentPage + 1);
    if (info.offset.x > 50 && currentPage > 0) goToPage(currentPage - 1);
  };

  const page = story.pages[currentPage];
  if (!page) return null;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-gray-900">{story.title}</h2>
        <span className="mt-1 inline-block rounded-full bg-brand-purple/10 px-3 py-0.5 text-sm font-medium capitalize text-brand-purple">
          {story.genre}
        </span>
      </div>

      {/* Page viewer with swipe */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            <StoryPageView page={page} totalPages={totalPages} />
          </motion.div>
        </AnimatePresence>

        {/* Arrow navigation */}
        {currentPage > 0 && (
          <button
            onClick={() => goToPage(currentPage - 1)}
            className="absolute left-2 top-1/3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-xl shadow-md backdrop-blur-sm transition-transform active:scale-90"
            aria-label="Previous page"
          >
            {'\u2039'}
          </button>
        )}
        {currentPage < totalPages - 1 && (
          <button
            onClick={() => goToPage(currentPage + 1)}
            className="absolute right-2 top-1/3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-xl shadow-md backdrop-blur-sm transition-transform active:scale-90"
            aria-label="Next page"
          >
            {'\u203A'}
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {creationId ? (
          <ShareButton
            creationId={creationId}
            creationTitle={story.title}
            creationType="story"
            className="flex-1"
          />
        ) : (
          <ShareButton
            creationId=""
            creationTitle={story.title}
            creationType="story"
            className="flex-1"
          />
        )}
        <DownloadButton
          creation={{
            id: creationId ?? '',
            type: 'story',
            title: story.title,
            content: story as unknown as StoryContent,
          }}
          variant="full"
          className="flex-1"
        />
        {!readOnly && (
          <button
            onClick={() => setShowXray(true)}
            className={cn(
              'flex-1 rounded-full border-2 border-brand-cyan py-3 text-center font-bold text-brand-cyan',
              'transition-all active:scale-95 hover:bg-brand-cyan/5'
            )}
          >
            AI X-Ray {'\uD83D\uDD0D'}
          </button>
        )}
      </div>

      {/* Print button for stories */}
      <button
        onClick={async () => {
          const { printStory } = await import('@/lib/export/printUtils');
          printStory(story);
        }}
        className="rounded-full border-2 border-gray-300 py-3 text-center font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
      >
        Print Story
      </button>

      {!readOnly && (
        <button
          onClick={onCreateAnother}
          className="rounded-full bg-gray-100 py-3 text-center font-bold text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
        >
          Create Another Story
        </button>
      )}

      {!readOnly && (
        <AiXrayPopup isOpen={showXray} onClose={() => setShowXray(false)} aiXray={aiXray} />
      )}
    </div>
  );
}
