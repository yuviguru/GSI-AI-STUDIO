'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn, formatCount } from '@/lib/utils';
import { DownloadButton } from '@/components/shared/DownloadButton';
import type { Creation, CreationType } from '@gsi/types';

interface CreationCardProps {
  creation: Creation;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const typeConfig: Record<
  CreationType,
  { label: string; emoji: string; bgClass: string; textClass: string }
> = {
  story: { label: 'Story', emoji: '📖', bgClass: 'bg-brand-purple/10', textClass: 'text-brand-purple' },
  music: { label: 'Music', emoji: '🎵', bgClass: 'bg-brand-orange/10', textClass: 'text-brand-orange' },
  quiz: { label: 'Quiz', emoji: '🧠', bgClass: 'bg-brand-cyan/10', textClass: 'text-brand-cyan' },
  game: { label: 'Game', emoji: '🎮', bgClass: 'bg-brand-purple/10', textClass: 'text-brand-purple' },
  comic: { label: 'Comic', emoji: '🖼️', bgClass: 'bg-brand-orange/10', textClass: 'text-brand-orange' },
};

const placeholderBg: Record<CreationType, string> = {
  story: 'bg-gradient-to-br from-brand-purple/20 to-brand-purple-light/30',
  music: 'bg-gradient-to-br from-brand-orange/20 to-brand-orange-light/30',
  quiz: 'bg-gradient-to-br from-brand-cyan/20 to-brand-cyan-light/30',
  game: 'bg-gradient-to-br from-brand-purple/20 to-brand-purple-light/30',
  comic: 'bg-gradient-to-br from-brand-orange/20 to-brand-orange-light/30',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function CreationCard({ creation, onShare, onDelete }: CreationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const config = typeConfig[creation.type] ?? typeConfig.story;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-2xl bg-white shadow-md transition-shadow hover:shadow-lg"
    >
      {/* Thumbnail / Placeholder */}
      <Link href={`/view/${creation.id}`} className="block">
        <div
          className={cn(
            'relative aspect-[4/3] w-full overflow-hidden',
            !creation.thumbnail && placeholderBg[creation.type]
          )}
        >
          {creation.thumbnail ? (
            <Image
              src={creation.thumbnail}
              alt={creation.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-5xl">{config.emoji}</span>
            </div>
          )}

          {/* Type badge */}
          <span
            className={cn(
              'absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-bold',
              config.bgClass,
              config.textClass
            )}
          >
            {config.label}
          </span>

          {/* Remixed badge */}
          {creation.remixedFromId && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-brand-purple/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              <RemixIcon /> Remixed
            </span>
          )}
        </div>
      </Link>

      {/* Card body */}
      <div className="p-3">
        <Link href={`/view/${creation.id}`}>
          <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug text-gray-900">
            {creation.title}
          </h3>
        </Link>

        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
          <span>{formatRelativeTime(creation.createdAt)}</span>
          <div className="flex items-center gap-2">
            {creation.viewCount > 0 && (
              <span className="flex items-center gap-0.5">
                <EyeIcon /> {formatCount(creation.viewCount)}
              </span>
            )}
            {creation.shareCount > 0 && (
              <span className="flex items-center gap-0.5">
                <ShareIcon /> {formatCount(creation.shareCount)}
              </span>
            )}
            {(creation.remixCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <RemixIcon /> {formatCount(creation.remixCount!)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3-dot menu */}
      <div className="absolute right-2 top-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          aria-label="More actions"
        >
          <MoreIcon />
        </button>

        {menuOpen && (
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-10 z-20 min-w-[140px] overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5">
              {onShare && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onShare(creation.id);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <ShareIcon /> Share
                </button>
              )}
              <DownloadButton
                creation={creation}
                variant="icon"
              />
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete(creation.id);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <TrashIcon /> Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Inline Icons ─────────────────────────────── */

function EyeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function RemixIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
