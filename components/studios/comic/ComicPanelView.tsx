'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ComicPanel } from '@/types/creation.types';

interface ComicPanelViewProps {
  panel: ComicPanel;
  totalPanels: number;
  onTap?: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

const BUBBLE_POSITION_CLASSES: Record<string, string> = {
  left: 'left-2 sm:left-3',
  right: 'right-2 sm:right-3',
  center: 'left-1/2 -translate-x-1/2',
};

export function ComicPanelView({ panel, totalPanels, onTap }: ComicPanelViewProps) {
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const retriesRef = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgState('loading');
    retriesRef.current = 0;
  }, [panel.imageUrl]);

  const handleError = () => {
    if (retriesRef.current < MAX_RETRIES) {
      retriesRef.current += 1;
      setTimeout(() => {
        if (imgRef.current) {
          setImgState('loading');
          const separator = panel.imageUrl.includes('?') ? '&' : '?';
          imgRef.current.src = `${panel.imageUrl}${separator}_retry=${retriesRef.current}`;
        }
      }, RETRY_DELAY);
    } else {
      setImgState('error');
    }
  };

  return (
    <div
      className="relative cursor-pointer overflow-hidden rounded-xl border-2 border-gray-900 bg-white shadow-sm transition-shadow hover:shadow-md"
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onTap?.()}
    >
      {/* Panel number badge */}
      <div className="absolute left-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
        {panel.panelNumber}
      </div>

      {/* Image area */}
      <div className="relative aspect-square w-full bg-gray-100">
        {/* Loading skeleton */}
        {imgState === 'loading' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-orange/5 to-pink-100/50">
            <div className="animate-pulse text-3xl">{'🎨'}</div>
            <span className="text-xs font-medium text-gray-400">Drawing...</span>
          </div>
        )}

        {/* Error fallback */}
        {imgState === 'error' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-orange-50 to-pink-50">
            <div className="text-3xl">{'🖼️'}</div>
            <span className="text-xs font-medium text-gray-400">Use your imagination!</span>
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element -- External image URLs from AI providers */}
        <img
          ref={imgRef}
          src={panel.imageUrl}
          alt={`Comic panel ${panel.panelNumber} of ${totalPanels}`}
          className={cn(
            'aspect-square w-full object-cover',
            'transition-opacity duration-500',
            imgState === 'loaded' ? 'opacity-100' : 'opacity-0'
          )}
          loading="eager"
          onLoad={() => setImgState('loaded')}
          onError={handleError}
        />

        {/* Speech bubbles overlay */}
        {panel.dialogue.length > 0 && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {panel.dialogue.map((d, i) => (
              <div
                key={i}
                className={cn(
                  'absolute max-w-[70%] pointer-events-auto',
                  BUBBLE_POSITION_CLASSES[d.position] ?? BUBBLE_POSITION_CLASSES.left,
                  i === 0 ? 'top-2 sm:top-3' : i === 1 ? 'bottom-12 sm:bottom-14' : 'top-1/2 -translate-y-1/2'
                )}
              >
                <div className="relative rounded-2xl bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-sm">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-brand-orange">
                    {d.character}
                  </span>
                  <p className="text-xs font-medium leading-snug text-gray-800 sm:text-sm">
                    {d.text}
                  </p>
                  {/* Speech bubble tail */}
                  <div
                    className={cn(
                      'absolute -bottom-1.5 h-3 w-3 rotate-45 bg-white/95',
                      d.position === 'right' ? 'right-4' : 'left-4'
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Caption strip */}
      {panel.caption && (
        <div className="border-t-2 border-gray-900 bg-yellow-50 px-3 py-1.5">
          <p className="text-center text-xs font-medium italic text-gray-700 sm:text-sm">
            {panel.caption}
          </p>
        </div>
      )}
    </div>
  );
}
