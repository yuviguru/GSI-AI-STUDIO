'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface StoryPageViewProps {
  page: { pageNumber: number; text: string; imageUrl: string };
  totalPages: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5s between retries — Pollinations needs time to generate

export function StoryPageView({ page, totalPages }: StoryPageViewProps) {
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const retriesRef = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when page changes
  useEffect(() => {
    setImgState('loading');
    retriesRef.current = 0;
  }, [page.imageUrl]);

  const handleError = () => {
    if (retriesRef.current < MAX_RETRIES) {
      retriesRef.current += 1;
      // Retry after delay — Pollinations generates on first request, may 530 initially
      setTimeout(() => {
        if (imgRef.current) {
          setImgState('loading');
          // Append a cache-buster to force re-fetch
          const separator = page.imageUrl.includes('?') ? '&' : '?';
          imgRef.current.src = `${page.imageUrl}${separator}_retry=${retriesRef.current}`;
        }
      }, RETRY_DELAY);
    } else {
      setImgState('error');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100">
        {/* Loading skeleton */}
        {imgState === 'loading' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-purple/5 to-brand-cyan/5">
            <div className="text-4xl animate-pulse">🎨</div>
            <span className="text-sm font-medium text-gray-400">
              Painting illustration...
            </span>
          </div>
        )}

        {/* Error fallback */}
        {imgState === 'error' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-50 to-orange-50">
            <div className="text-4xl">📖</div>
            <span className="text-sm font-medium text-gray-400">
              Use your imagination!
            </span>
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element -- Pollinations/Replicate URLs are dynamic external domains */}
        <img
          ref={imgRef}
          src={page.imageUrl}
          alt={`Story illustration — page ${page.pageNumber}`}
          className={cn(
            'aspect-[3/2] w-full object-cover',
            'transition-opacity duration-500',
            imgState === 'loaded' ? 'opacity-100' : 'opacity-0'
          )}
          loading="eager"
          onLoad={() => setImgState('loaded')}
          onError={handleError}
        />
      </div>

      <p className="px-2 text-center font-display text-lg leading-relaxed text-gray-800">
        {page.text}
      </p>

      <span className="text-sm font-medium text-gray-400">
        Page {page.pageNumber} of {totalPages}
      </span>
    </div>
  );
}
