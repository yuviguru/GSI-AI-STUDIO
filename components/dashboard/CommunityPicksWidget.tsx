'use client';

import Link from 'next/link';
import { BookOpen, Music, HelpCircle, Gamepad2, Palette, Sparkles } from 'lucide-react';
import { useExplore } from '@/hooks/useExplore';
import { cn } from '@/lib/utils';

const TYPE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; gradient: string }> = {
  story: { icon: BookOpen,    gradient: 'from-violet-100 to-purple-50' },
  music: { icon: Music,       gradient: 'from-orange-100 to-rose-50' },
  quiz:  { icon: HelpCircle,  gradient: 'from-cyan-100 to-blue-50' },
  game:  { icon: Gamepad2,    gradient: 'from-emerald-100 to-teal-50' },
  comic: { icon: Palette,     gradient: 'from-orange-100 to-amber-50' },
};

const FALLBACK_META = { icon: Sparkles, gradient: 'from-gray-100 to-gray-50' };

export function CommunityPicksWidget() {
  const { creations, loading } = useExplore();
  const picks = creations.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-gray-900">Community Picks</h3>
        <Link href="/explore" className="text-xs font-semibold text-brand-purple hover:underline">
          Explore →
        </Link>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))
        ) : picks.length === 0 ? (
          <div className="col-span-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-6 text-center">
            <p className="text-xs text-gray-400">No community creations yet</p>
          </div>
        ) : (
          picks.map((creation) => {
            const meta = TYPE_META[creation.type] ?? FALLBACK_META;
            const Icon = meta.icon;
            return (
              <Link key={creation.id} href={`/view/${creation.id}`} className="group block">
                <div className="overflow-hidden rounded-xl border border-gray-100 shadow-card transition-shadow hover:shadow-card-hover">
                  <div className={cn('flex h-16 items-center justify-center bg-gradient-to-br', meta.gradient)}>
                    <Icon className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="bg-white px-2 py-1.5">
                    <p className="truncate text-[11px] font-bold text-gray-700">{creation.title}</p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
