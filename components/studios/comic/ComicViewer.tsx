'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ComicPanelView } from './ComicPanelView';
import { AiXrayPopup } from '@/components/learning/AiXrayPopup';
import { ShareButton } from '@/components/shared/ShareButton';
import type { AiXrayData, ComicContent } from '@/types';

interface ComicViewerProps {
  comic: ComicContent;
  aiXray: AiXrayData;
  onCreateAnother: () => void;
  creationId?: string;
  readOnly?: boolean;
}

export function ComicViewer({ comic, aiXray, onCreateAnother, creationId, readOnly = false }: ComicViewerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'read'>('grid');
  const [readPanel, setReadPanel] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showXray, setShowXray] = useState(false);

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

  const goToPanel = useCallback((next: number) => {
    if (next < 0 || next >= totalPanels) return;
    setDirection(next > readPanel ? 1 : -1);
    setReadPanel(next);
  }, [readPanel, totalPanels]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -50 && readPanel < totalPanels - 1) goToPanel(readPanel + 1);
    if (info.offset.x > 50 && readPanel > 0) goToPanel(readPanel - 1);
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };

  const currentPanel = comic.panels[readPanel];

  return (
    <div className="flex flex-col gap-4">
      {/* Title + style badge */}
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-gray-900">{comic.title}</h2>
        <span className="mt-1 inline-block rounded-full bg-orange-100 px-3 py-0.5 text-sm font-medium capitalize text-orange-600">
          {comic.style} style
        </span>
      </div>

      {/* View mode toggle */}
      <div className="flex rounded-xl border border-gray-200 p-1">
        <button
          onClick={() => setViewMode('grid')}
          className={cn(
            'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
            viewMode === 'grid' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500'
          )}
        >
          Grid View
        </button>
        <button
          onClick={() => setViewMode('read')}
          className={cn(
            'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
            viewMode === 'read' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500'
          )}
        >
          Read Mode
        </button>
      </div>

      {/* Grid Mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 gap-3">
          {comic.panels.map((panel) => (
            <ComicPanelView key={panel.panelNumber} panel={panel} />
          ))}
        </div>
      )}

      {/* Read Mode */}
      {viewMode === 'read' && currentPanel && (
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={readPanel}
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
              <ComicPanelView panel={currentPanel} />
            </motion.div>
          </AnimatePresence>

          {/* Arrow navigation */}
          {readPanel > 0 && (
            <button
              onClick={() => goToPanel(readPanel - 1)}
              className="absolute left-2 top-1/3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-xl shadow-md backdrop-blur-sm transition-transform active:scale-90"
              aria-label="Previous panel"
            >
              {'\u2039'}
            </button>
          )}
          {readPanel < totalPanels - 1 && (
            <button
              onClick={() => goToPanel(readPanel + 1)}
              className="absolute right-2 top-1/3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-xl shadow-md backdrop-blur-sm transition-transform active:scale-90"
              aria-label="Next panel"
            >
              {'\u203A'}
            </button>
          )}

          <p className="mt-2 text-center text-sm text-gray-400">
            Panel {readPanel + 1} of {totalPanels}
          </p>
        </div>
      )}

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
