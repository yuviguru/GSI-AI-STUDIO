'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StoryPageView } from './StoryPageView';
import { AiXrayPopup } from '@/components/learning/AiXrayPopup';
import type { AiXrayData } from '@/types';

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
}

export function StoryViewer({ story, aiXray, onCreateAnother }: StoryViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showXray, setShowXray] = useState(false);

  // Auto-show X-Ray on first creation per session
  useEffect(() => {
    const key = 'gsi-xray-shown-story';
    if (!sessionStorage.getItem(key)) {
      setShowXray(true);
      sessionStorage.setItem(key, 'true');
    }
  }, []);

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

  const handleShare = async () => {
    const shareData = {
      title: story.title,
      text: `Check out my AI story: ${story.title}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
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
            ‹
          </button>
        )}
        {currentPage < totalPages - 1 && (
          <button
            onClick={() => goToPage(currentPage + 1)}
            className="absolute right-2 top-1/3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-xl shadow-md backdrop-blur-sm transition-transform active:scale-90"
            aria-label="Next page"
          >
            ›
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className={cn(
            'flex-1 rounded-full border-2 border-brand-purple py-3 text-center font-bold text-brand-purple',
            'transition-all active:scale-95 hover:bg-brand-purple/5'
          )}
        >
          Share
        </button>
        <button
          onClick={() => setShowXray(true)}
          className={cn(
            'flex-1 rounded-full border-2 border-brand-cyan py-3 text-center font-bold text-brand-cyan',
            'transition-all active:scale-95 hover:bg-brand-cyan/5'
          )}
        >
          AI X-Ray 🔍
        </button>
      </div>

      <button
        onClick={onCreateAnother}
        className="rounded-full bg-gray-100 py-3 text-center font-bold text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
      >
        Create Another Story
      </button>

      <AiXrayPopup isOpen={showXray} onClose={() => setShowXray(false)} aiXray={aiXray} />
    </div>
  );
}
