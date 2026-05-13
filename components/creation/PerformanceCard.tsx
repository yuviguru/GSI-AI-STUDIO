'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Play, Pause, MoreVertical, Trash2, Music2 } from 'lucide-react';
import { cn, formatCount } from '@/lib/utils';
import type { PerformanceFeedItem } from '@gsi/types';

interface PerformanceCardProps {
  performance: PerformanceFeedItem;
  isMine?: boolean;
  onDelete?: (id: string) => void;
}

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

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const kindLabel: Record<PerformanceFeedItem['kind'], string> = {
  sing_along: 'Sing-Along',
  reading: 'Reading',
  voice_memo: 'Voice Memo',
  reaction: 'Reaction',
};

export function PerformanceCard({
  performance,
  isMine = false,
  onDelete,
}: PerformanceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pause when audio ends
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnd);
    return () => audio.removeEventListener('ended', onEnd);
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => undefined);
      setIsPlaying(true);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-2xl bg-white shadow-md transition-shadow hover:shadow-lg"
    >
      {/* Hidden audio element drives the inline player */}
      <audio
        ref={audioRef}
        src={performance.audioUrl}
        preload="metadata"
        className="hidden"
      />

      {/* Thumbnail / waveform area */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-orange/20 to-brand-purple/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-brand-orange shadow-lg backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 fill-current" />
            ) : (
              <Play className="ml-0.5 h-7 w-7 fill-current" />
            )}
          </button>
        </div>

        {/* Decorative waveform */}
        <div className="absolute inset-x-4 bottom-3 flex items-end gap-1">
          {Array.from({ length: 32 }).map((_, i) => {
            const h = 4 + Math.abs(Math.sin(i * 1.3)) * 18;
            return (
              <span
                key={i}
                className="block w-1 rounded-full bg-brand-orange/60"
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>

        {/* Type badge */}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-brand-purple shadow-sm">
          🎤 {kindLabel[performance.kind]}
        </span>

        {/* Duration */}
        <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
          {formatDuration(performance.durationSec)}
        </span>

        {/* Menu (delete) — only for owner */}
        {isMine && onDelete && (
          <div className="absolute right-2 top-2">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-700 hover:bg-white"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 min-w-[120px] overflow-hidden rounded-xl bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(performance.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="space-y-2 p-3">
        {/* Caption */}
        {performance.caption && (
          <p className="line-clamp-2 text-sm text-gray-800">{performance.caption}</p>
        )}

        {/* Parent creation chip */}
        {performance.parentCreation && (
          <Link
            href={`/view/${performance.parentCreation.id}`}
            className="flex items-center gap-1.5 rounded-full bg-brand-purple/5 px-2 py-1 text-xs font-semibold text-brand-purple hover:bg-brand-purple/10"
          >
            <Music2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{performance.parentCreation.title}</span>
          </Link>
        )}

        {/* Footer: kid + time + reactions */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="truncate">
            {isMine ? 'You' : performance.kid.name} · {formatRelativeTime(performance.createdAt)}
          </span>
          {performance.likeCount > 0 && (
            <span className={cn('font-semibold', 'text-brand-orange')}>
              {formatCount(performance.likeCount)} ❤
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
