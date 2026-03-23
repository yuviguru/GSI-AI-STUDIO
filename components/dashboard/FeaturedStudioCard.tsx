'use client';

import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';

const FEATURED_STUDIOS = [
  {
    href: '/create/story',
    emoji: '📖',
    title: 'Story Studio',
    tagline: 'Craft illustrated stories with AI in minutes',
    bg: 'from-amber-50 to-yellow-100',
    floatText: 'Once upon a time...',
    badge: '#1 Trending',
    rating: '4.9',
  },
  {
    href: '/create/music',
    emoji: '🎵',
    title: 'Music Lab',
    tagline: 'Compose original songs with AI beats',
    bg: 'from-orange-50 to-rose-100',
    floatText: '♪ ♫ ♩ ♬',
    badge: '#2 Popular',
    rating: '4.8',
  },
  {
    href: '/create/comic',
    emoji: '🎨',
    title: 'Comic Studio',
    tagline: 'Draw multi-panel comics with AI art',
    bg: 'from-violet-50 to-purple-100',
    floatText: 'POW! ZAP!',
    badge: '#1 Creative',
    rating: '4.9',
  },
  {
    href: '/create/game',
    emoji: '🕹️',
    title: 'Game Studio',
    tagline: 'Build text adventures with AI-written plots',
    bg: 'from-emerald-50 to-teal-100',
    floatText: 'Level 1 →',
    badge: '#3 Fun',
    rating: '4.7',
  },
  {
    href: '/create/quiz',
    emoji: '🎮',
    title: 'Quiz Maker',
    tagline: 'Build quizzes and challenge your friends',
    bg: 'from-cyan-50 to-blue-100',
    floatText: 'Q: What is AI?',
    badge: '#2 Learning',
    rating: '4.8',
  },
  {
    href: '/beat-the-ai',
    emoji: '🤖',
    title: 'Beat the AI',
    tagline: 'Challenge artificial intelligence with your creativity',
    bg: 'from-purple-50 to-indigo-100',
    floatText: 'Human vs AI',
    badge: '#1 Challenge',
    rating: '5.0',
  },
];

export function FeaturedStudioCard() {
  const weekIndex = Math.floor(Date.now() / (86400000 * 7)) % FEATURED_STUDIOS.length;
  const studio = FEATURED_STUDIOS[weekIndex] ?? FEATURED_STUDIOS[0]!;

  return (
    <Link href={studio.href} className="group block">
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">

        {/* Card header row */}
        <div className="flex items-center justify-between px-4 pt-4">
          <h3 className="font-display text-base font-bold text-gray-900">{studio.title}</h3>
          <button
            onClick={(e) => e.preventDefault()}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Rank badge */}
        <div className="px-4 pt-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-bold text-gray-500">
            🎖️ {studio.badge}
          </span>
        </div>

        {/* Large illustration */}
        <div className={`relative mx-3 mt-3 flex h-48 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-br ${studio.bg}`}>
          <span className="mb-4 text-[88px] leading-none">{studio.emoji}</span>
          {/* Floating decorative text */}
          <span className="absolute right-3 top-5 max-w-[80px] rotate-6 text-right font-mono text-xs font-bold leading-tight text-gray-400/60">
            {studio.floatText}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4">
          <p className="max-w-[160px] text-xs leading-snug text-gray-500">{studio.tagline}</p>
          <div className="ml-3 flex shrink-0 flex-col items-center rounded-xl bg-amber-50 px-3 py-2">
            <p className="font-mono text-base font-extrabold text-amber-500">{studio.rating}</p>
            <p className="text-xs text-amber-400">⭐</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
