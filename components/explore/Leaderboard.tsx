'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse } from '@/types/api.types';

interface CreatorEntry {
  sessionId: string;
  creationCount: number;
}

const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
const avatarColors = [
  'bg-brand-purple/20 text-brand-purple',
  'bg-brand-orange/20 text-brand-orange',
  'bg-brand-cyan/20 text-brand-cyan',
  'bg-pink-100 text-pink-600',
  'bg-green-100 text-green-600',
];

export function Leaderboard() {
  const [creators, setCreators] = useState<CreatorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/creations/public?leaderboard=true');
        const json: ApiResponse<{ creators: CreatorEntry[] }> = await res.json();
        if (cancelled) return;
        if (json.success && json.data) {
          setCreators(json.data.creators);
        }
      } catch {
        // Silently fail — leaderboard is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLeaderboard();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-md">
        <h3 className="font-display text-base font-bold text-gray-900">
          Top Creators
        </h3>
        <div className="mt-3 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-24 rounded bg-gray-200" />
                <div className="h-2.5 w-16 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (creators.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-md">
      <h3 className="font-display text-base font-bold text-gray-900">
        Top Creators
      </h3>
      <div className="mt-3 space-y-2.5">
        {creators.map((creator, idx) => (
          <div
            key={creator.sessionId}
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-50"
          >
            <span className="text-lg leading-none">{rankEmojis[idx]}</span>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColors[idx]}`}
            >
              {String.fromCodePoint(0x1f9d1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800">
                Anonymous Creator
              </p>
              <p className="text-xs text-gray-400">
                {creator.creationCount} creation{creator.creationCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
