'use client';

import { cn } from '@/lib/utils';

interface StoryPageViewProps {
  page: { pageNumber: number; text: string; imageUrl: string };
  totalPages: number;
}

export function StoryPageView({ page, totalPages }: StoryPageViewProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- Replicate URLs are dynamic external domains */}
        <img
          src={page.imageUrl}
          alt={`Story illustration — page ${page.pageNumber}`}
          className={cn(
            'aspect-[3/2] w-full object-cover',
            'transition-opacity duration-300'
          )}
          loading="eager"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/placeholder-story.png';
          }}
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
