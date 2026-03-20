'use client';

import Link from 'next/link';
import { useCreations } from '@/hooks/useCreations';
import type { Creation } from '@/types/creation.types';
import { cn } from '@/lib/utils';

const TYPE_META: Record<string, { emoji: string; gradient: string }> = {
  story: { emoji: '📖', gradient: 'from-violet-100 to-purple-100' },
  music: { emoji: '🎵', gradient: 'from-orange-100 to-rose-100' },
  quiz: { emoji: '🎮', gradient: 'from-cyan-100 to-blue-100' },
  game: { emoji: '🕹️', gradient: 'from-emerald-100 to-teal-100' },
  comic: { emoji: '🎨', gradient: 'from-orange-100 to-amber-100' },
};

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return 'Just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function CreationMiniCard({ creation }: { creation: Creation }) {
  const meta = TYPE_META[creation.type] ?? { emoji: '✨', gradient: 'from-gray-100 to-gray-50' };
  return (
    <Link href={`/view/${creation.id}`} className="group block">
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {/* Placeholder thumbnail */}
        <div className={cn('flex h-20 items-center justify-center bg-gradient-to-br text-3xl', meta.gradient)}>
          {meta.emoji}
        </div>
        <div className="p-2">
          <p className="truncate text-xs font-bold text-gray-800">{creation.title}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(creation.createdAt)}</p>
        </div>
      </div>
    </Link>
  );
}

function EmptySlot() {
  return (
    <Link href="/create/story" className="group block">
      <div className="flex h-full min-h-[108px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-3 text-center transition-colors hover:border-brand-purple/30 hover:bg-brand-purple/5">
        <span className="text-2xl">🚀</span>
        <p className="mt-1 text-xs font-bold text-gray-500">Create First!</p>
      </div>
    </Link>
  );
}

export function MyCreationsMiniGallery() {
  const { creations, loading } = useCreations();

  const displayed = creations.slice(0, 2);
  const showEmpty = displayed.length < 2;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-gray-900">My Creations</h3>
        <Link href="/creations" className="text-xs font-semibold text-brand-purple hover:underline">
          View all →
        </Link>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {loading ? (
          <>
            {[0, 1].map((i) => (
              <div key={i} className="h-[108px] animate-pulse rounded-xl bg-gray-100" />
            ))}
            <div className="h-[108px] animate-pulse rounded-xl bg-gray-100" />
          </>
        ) : (
          <>
            {displayed.map((c) => (
              <CreationMiniCard key={c.id} creation={c} />
            ))}
            {showEmpty && (
              <>
                {displayed.length === 0 && <EmptySlot />}
                <EmptySlot />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
