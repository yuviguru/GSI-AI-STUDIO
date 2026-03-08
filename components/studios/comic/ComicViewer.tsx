'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ComicPanelView } from './ComicPanelView';
import { AiXrayPopup } from '@/components/learning/AiXrayPopup';
import { ShareButton } from '@/components/shared/ShareButton';
import type { AiXrayData, ComicContent } from '@/types';

interface ComicViewerProps {
  comic: ComicContent & { title: string };
  aiXray: AiXrayData;
  onCreateAnother: () => void;
  creationId?: string;
  readOnly?: boolean;
}

type ViewMode = 'grid' | 'read';

export function ComicViewer({
  comic,
  aiXray,
  onCreateAnother,
  creationId,
  readOnly = false,
}: ComicViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPanel, setCurrentPanel] = useState(0);
  const [showXray, setShowXray] = useState(false);
  const [fullscreenPanel, setFullscreenPanel] = useState<number | null>(null);

  // Auto-show X-Ray on first creation per session
  useEffect(() => {
    if (readOnly) return;
    const key = 'gsi-xray-shown-comic';
    if (!sessionStorage.getItem(key)) {
      setShowXray(true);
      sessionStorage.setItem(key, 'true');
    }
  }, [readOnly]);

  const totalPanels = comic.panels.length;

  const goToPanel = useCallback(
    (next: number) => {
      if (next < 0 || next >= totalPanels) return;
      setCurrentPanel(next);
    },
    [totalPanels]
  );

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -50 && currentPanel < totalPanels - 1) goToPanel(currentPanel + 1);
    if (info.offset.x > 50 && currentPanel > 0) goToPanel(currentPanel - 1);
  };

  const panel = comic.panels[currentPanel];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title & characters */}
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-gray-900">{comic.title}</h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-brand-orange/10 px-3 py-0.5 text-sm font-medium capitalize text-brand-orange">
            {comic.style}
          </span>
          {comic.characters.map((char) => (
            <span
              key={char.name}
              className="rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-600"
            >
              {char.name}
            </span>
          ))}
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center justify-center gap-1 rounded-full bg-gray-100 p-1">
        <button
          onClick={() => setViewMode('grid')}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
            viewMode === 'grid'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Grid View
        </button>
        <button
          onClick={() => setViewMode('read')}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
            viewMode === 'read'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Read Mode
        </button>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 gap-3">
          {comic.panels.map((p) => (
            <ComicPanelView
              key={p.panelNumber}
              panel={p}
              totalPanels={totalPanels}
              onTap={() => {
                setCurrentPanel(p.panelNumber - 1);
                setFullscreenPanel(p.panelNumber - 1);
              }}
            />
          ))}
        </div>
      )}

      {/* Read Mode - sequential swipe */}
      {viewMode === 'read' && panel && (
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={1}>
            <motion.div
              key={currentPanel}
              custom={1}
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
              <div className="mx-auto max-w-sm">
                <ComicPanelView panel={panel} totalPanels={totalPanels} />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          {currentPanel > 0 && (
            <button
              onClick={() => goToPanel(currentPanel - 1)}
              className="absolute left-2 top-1/3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-xl shadow-md backdrop-blur-sm transition-transform active:scale-90"
              aria-label="Previous panel"
            >
              {'\u2039'}
            </button>
          )}
          {currentPanel < totalPanels - 1 && (
            <button
              onClick={() => goToPanel(currentPanel + 1)}
              className="absolute right-2 top-1/3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-xl shadow-md backdrop-blur-sm transition-transform active:scale-90"
              aria-label="Next panel"
            >
              {'\u203A'}
            </button>
          )}

          {/* Panel indicator */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {comic.panels.map((_, i) => (
              <button
                key={i}
                onClick={() => goToPanel(i)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === currentPanel ? 'w-6 bg-brand-orange' : 'w-2 bg-gray-300'
                )}
                aria-label={`Go to panel ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen panel modal */}
      <AnimatePresence>
        {fullscreenPanel !== null && comic.panels[fullscreenPanel] && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenPanel(null)}
          >
            <motion.div
              className="max-h-[90vh] max-w-lg overflow-auto"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ComicPanelView
                panel={comic.panels[fullscreenPanel]!}
                totalPanels={totalPanels}
              />
            </motion.div>
            <button
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl text-white backdrop-blur-sm"
              onClick={() => setFullscreenPanel(null)}
              aria-label="Close fullscreen"
            >
              x
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3">
        <ShareButton
          creationId={creationId ?? ''}
          creationTitle={comic.title}
          creationType="comic"
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

      {!readOnly && (
        <button
          onClick={onCreateAnother}
          className="rounded-full bg-gray-100 py-3 text-center font-bold text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
        >
          Create Another Comic
        </button>
      )}

      {!readOnly && (
        <AiXrayPopup isOpen={showXray} onClose={() => setShowXray(false)} aiXray={aiXray} />
      )}
    </div>
  );
}
