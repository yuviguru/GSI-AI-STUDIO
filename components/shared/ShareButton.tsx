'use client';

import { useState, useCallback } from 'react';
import { cn, formatCount } from '@/lib/utils';
import { ShareSheet } from './ShareSheet';
import type { CreationType } from '@gsi/types';

interface ShareButtonProps {
  creationId: string;
  creationTitle: string;
  creationType: CreationType;
  shareCount?: number;
  className?: string;
  variant?: 'primary' | 'outline';
}

interface ShareData {
  shareUrl: string;
  whatsappUrl: string;
  ogImage: string;
}

export function ShareButton({
  creationId,
  creationTitle,
  creationType,
  shareCount = 0,
  className,
  variant = 'outline',
}: ShareButtonProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/share/${creationId}`, { method: 'POST' });
      const json = await res.json();

      if (json.success && json.data) {
        setShareData(json.data);
        setIsSheetOpen(true);
      } else {
        throw new Error('API returned error');
      }
    } catch {
      // Fallback: try native share or clipboard
      const url = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({
            title: creationTitle,
            text: `Check out what I made with AI: ${creationTitle}`,
            url,
          });
        } catch { /* user cancelled */ }
      } else {
        await navigator.clipboard.writeText(url);
      }
    } finally {
      setIsLoading(false);
    }
  }, [creationId, creationTitle]);

  const outlineStyles: Record<string, string> = {
    story: 'border-2 border-brand-purple text-brand-purple hover:bg-brand-purple/5',
    music: 'border-2 border-brand-orange text-brand-orange hover:bg-brand-orange/5',
    quiz: 'border-2 border-brand-cyan text-brand-cyan hover:bg-brand-cyan/5',
    game: 'border-2 border-brand-purple text-brand-purple hover:bg-brand-purple/5',
    comic: 'border-2 border-brand-orange text-brand-orange hover:bg-brand-orange/5',
  };

  const primaryStyles: Record<string, string> = {
    story: 'bg-brand-purple text-white hover:opacity-90',
    music: 'bg-brand-orange text-white hover:opacity-90',
    quiz: 'bg-brand-cyan text-white hover:opacity-90',
    game: 'bg-brand-purple text-white hover:opacity-90',
    comic: 'bg-brand-orange text-white hover:opacity-90',
  };

  const buttonStyles = variant === 'primary'
    ? primaryStyles[creationType] ?? primaryStyles.story
    : outlineStyles[creationType] ?? outlineStyles.story;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          'flex items-center justify-center gap-2 rounded-full py-3 font-bold transition-all active:scale-95',
          buttonStyles,
          isLoading && 'cursor-wait opacity-70',
          className
        )}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <ShareIconSmall />
        )}
        Share
        {shareCount > 0 && (
          <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold">
            {formatCount(shareCount)}
          </span>
        )}
      </button>

      {shareData && (
        <ShareSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          shareUrl={shareData.shareUrl}
          whatsappUrl={shareData.whatsappUrl}
          creationTitle={creationTitle}
        />
      )}
    </>
  );
}

function ShareIconSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
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
