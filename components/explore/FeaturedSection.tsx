'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Creation } from '@gsi/types';
import type { ApiResponse } from '@gsi/types';

// Hardcoded featured creation IDs — can be made dynamic later
const FEATURED_IDS: string[] = [];

interface FeaturedSectionProps {
  featuredIds?: string[];
}

export function FeaturedSection({ featuredIds = FEATURED_IDS }: FeaturedSectionProps) {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (featuredIds.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchFeatured() {
      try {
        const results = await Promise.all(
          featuredIds.map(async (id) => {
            const res = await fetch(`/api/creations/${id}`);
            const json: ApiResponse<Creation> = await res.json();
            return json.success && json.data ? json.data : null;
          })
        );
        if (cancelled) return;
        setCreations(results.filter((c): c is Creation => c !== null));
      } catch {
        // Silently fail — featured section is optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFeatured();
    return () => { cancelled = true; };
  }, [featuredIds]);

  // Don't render if no featured IDs configured or all failed to load
  if (!loading && creations.length === 0) return null;

  if (loading && featuredIds.length > 0) {
    return (
      <div className="mb-6">
        <h2 className="mb-3 font-display text-lg font-bold text-gray-900">
          Featured
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-56 shrink-0 animate-pulse overflow-hidden rounded-2xl bg-white shadow-md"
            >
              <div className="aspect-[16/9] w-full bg-gray-200" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="mb-3 font-display text-lg font-bold text-gray-900">
        Featured
      </h2>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
      >
        {creations.map((creation) => (
          <FeaturedCard key={creation.id} creation={creation} />
        ))}
      </div>
    </div>
  );
}

const typeEmoji: Record<string, string> = {
  story: '📖',
  music: '🎵',
  quiz: '🧠',
  game: '🎮',
  comic: '🖼️',
};

function FeaturedCard({ creation }: { creation: Creation }) {
  return (
    <Link
      href={`/view/${creation.id}`}
      className="group w-56 shrink-0 overflow-hidden rounded-2xl bg-white shadow-md transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20">
        {creation.thumbnail ? (
          <Image
            src={creation.thumbnail}
            alt={creation.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="224px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">
              {typeEmoji[creation.type] ?? '✨'}
            </span>
          </div>
        )}
        <span
          className={cn(
            'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold',
            'bg-yellow-400/90 text-yellow-900'
          )}
        >
          Featured
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 font-display text-sm font-bold text-gray-900">
          {creation.title}
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          {typeEmoji[creation.type]} {creation.type.charAt(0).toUpperCase() + creation.type.slice(1)}
        </p>
      </div>
    </Link>
  );
}
