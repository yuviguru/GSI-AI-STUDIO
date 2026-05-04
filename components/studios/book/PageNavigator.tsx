'use client';

import { Plus } from 'lucide-react';
import type { BookPage } from '@/types/book.types';

interface PageNavigatorProps {
  pages: BookPage[];
  currentPageId: string | null;
  pageLimit: number;
  onSelectPage: (pageId: string) => void;
  onAppendPage: () => void;
  appendDisabled?: boolean;
}

export function PageNavigator({
  pages,
  currentPageId,
  pageLimit,
  onSelectPage,
  onAppendPage,
  appendDisabled = false,
}: PageNavigatorProps) {
  const atCap = pages.length >= pageLimit;

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2">
      <div className="flex items-center gap-1.5">
        {pages.map((page) => {
          const isActive = page.id === currentPageId;
          return (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              type="button"
              className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-lg border-2 text-xs transition-all ${
                isActive
                  ? 'border-brand-purple bg-brand-purple/10 font-semibold text-brand-purple'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
              }`}
              aria-label={`Go to page ${page.pageNumber}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-base">📄</span>
              <span className="mt-0.5">{page.pageNumber}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAppendPage}
        disabled={atCap || appendDisabled}
        className="ml-1 flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-brand-purple hover:text-brand-purple disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:text-gray-400"
        aria-label="Add new page"
        title={atCap ? `You've filled your ${pageLimit}-page book!` : 'Add a new page'}
      >
        <Plus className="h-5 w-5" />
      </button>

      <div className="ml-auto shrink-0 text-xs text-gray-500">
        {pages.length} of {pageLimit}
      </div>
    </div>
  );
}
