'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ComicPanel } from '@gsi/types';

interface ComicPanelViewProps {
  panel: ComicPanel;
}

const POSITION_CLASSES: Record<string, string> = {
  left: 'top-2 left-2',
  right: 'top-2 right-2',
  center: 'top-2 left-1/2 -translate-x-1/2',
};

export function ComicPanelView({ panel }: ComicPanelViewProps) {
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const retriesRef = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleError = () => {
    if (retriesRef.current < 2 && imgRef.current) {
      retriesRef.current++;
      const src = imgRef.current.src;
      imgRef.current.src = '';
      setTimeout(() => {
        if (imgRef.current) imgRef.current.src = src;
      }, 1000);
    } else {
      setImgState('error');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-gray-800 bg-gray-900">
      {/* Panel image — square aspect ratio */}
      <div className="relative aspect-square w-full">
        {/* Loading skeleton */}
        {imgState === 'loading' && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 to-gray-300" />
        )}

        {/* Error fallback */}
        {imgState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
            <span className="text-3xl">🎨</span>
            <span className="mt-1 text-xs font-medium">Panel {panel.panelNumber}</span>
          </div>
        )}

        <img
          ref={imgRef}
          src={panel.imageUrl}
          alt={`Panel ${panel.panelNumber}`}
          className={cn(
            'aspect-square w-full object-cover transition-opacity duration-300',
            imgState === 'loaded' ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setImgState('loaded')}
          onError={handleError}
        />

        {/* Speech bubble overlays */}
        {panel.dialogue.map((d, idx) => {
          const posClass = POSITION_CLASSES[d.position] ?? POSITION_CLASSES.left!;
          // Offset second bubble down so they don't overlap
          const offsetY = idx > 0 ? 'mt-12' : '';

          return (
            <div
              key={idx}
              className={cn('absolute z-10 max-w-[55%]', posClass, offsetY)}
              style={idx > 0 ? { top: `${2 + idx * 3}rem` } : undefined}
            >
              <div className="relative rounded-2xl bg-white/95 px-2.5 py-1.5 shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-wide text-orange-500">
                  {d.character}
                </p>
                <p className="text-xs font-bold leading-tight text-gray-900">
                  {d.text}
                </p>
                {/* Tail pointer */}
                <div className="absolute -bottom-1.5 left-3 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white/95" />
              </div>
            </div>
          );
        })}

        {/* Caption strip */}
        {panel.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-1.5">
            <p className="text-center text-xs font-semibold italic text-white">
              {panel.caption}
            </p>
          </div>
        )}
      </div>

      {/* Panel number badge */}
      <div className="absolute bottom-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white">
        {panel.panelNumber}
      </div>
    </div>
  );
}
