'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Creation, StoryContent, QuizContent, MusicContent } from '@/types/creation.types';

/** Minimal creation data needed for download — accepts full Creation or a subset */
type DownloadableCreation = Pick<Creation, 'id' | 'type' | 'title' | 'content'>;

interface DownloadButtonProps {
  creation: DownloadableCreation;
  variant: 'icon' | 'full';
  className?: string;
}

/** Trigger a browser download for the given blob/URL with a filename. */
function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/** Fire-and-forget call to track download count */
function trackDownload(creationId: string) {
  fetch(`/api/download/${creationId}`, { method: 'POST' }).catch(() => {
    // Fire-and-forget — ignore errors
  });
}

export function DownloadButton({ creation, variant, className }: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsLoading(true);
    try {
      const slug = sanitizeFilename(creation.title);

      if (creation.type === 'story' || creation.type === 'comic') {
        const { generateStoryPdf } = await import('@/lib/export/pdfGenerator');
        const content = creation.content as StoryContent;
        const blob = await generateStoryPdf({ ...content, title: creation.title });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${slug}-gsi-ai-studio.pdf`);
        URL.revokeObjectURL(url);
      } else if (creation.type === 'music') {
        const content = creation.content as MusicContent;
        if (!content.audioUrl) {
          throw new Error('Audio URL not available for download');
        }
        triggerDownload(content.audioUrl, `${slug}-gsi-ai-studio.mp3`);
      } else if (creation.type === 'quiz') {
        const { generateQuizPdf } = await import('@/lib/export/pdfGenerator');
        const content = creation.content as QuizContent;
        const blob = await generateQuizPdf({ ...content, title: creation.title });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${slug}-gsi-ai-studio.pdf`);
        URL.revokeObjectURL(url);
      }

      trackDownload(creation.id);
    } catch (err) {
      console.error('[DownloadButton] Download failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [creation]);

  if (variant === 'icon') {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDownload();
        }}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 w-full',
          isLoading && 'cursor-wait opacity-70',
          className
        )}
        aria-label="Download"
      >
        {isLoading ? <LoadingSpinner /> : <DownloadIcon />}
        Download
      </button>
    );
  }

  // full variant — styled like ShareButton
  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className={cn(
        'flex items-center justify-center gap-2 rounded-full border-2 py-3 font-bold transition-all active:scale-95',
        'border-green-500 text-green-600 hover:bg-green-50',
        isLoading && 'cursor-wait opacity-70',
        className
      )}
    >
      {isLoading ? <LoadingSpinner /> : <DownloadIcon />}
      Download
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}
