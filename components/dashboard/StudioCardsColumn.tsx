'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { StudioLaunchPill } from '@/components/studios/shared/StudioLaunchPill';
import type { StudioId } from '@gsi/types';

interface StudioCard {
  studioId: StudioId;
  href: string;
  emoji: string;
  title: string;
  description: string;
  tag: string;
  tagBg: string;
  gradient: string;
  xp: number;
  gems: number;
}

const STUDIO_CARDS: StudioCard[] = [
  {
    studioId: 'story',
    href: '/create/story',
    emoji: '📖',
    title: 'Story Studio',
    description: 'Write & illustrate amazing AI-powered stories',
    tag: 'Featured Studio',
    tagBg: 'bg-brand-secondary/15 text-brand-secondary',
    gradient: 'from-violet-200 via-purple-100 to-indigo-50',
    xp: 145,
    gems: 5,
  },
  {
    studioId: 'music',
    href: '/create/music',
    emoji: '🎵',
    title: 'Music Lab',
    description: 'Compose original songs & beats with AI',
    tag: 'New Release',
    tagBg: 'bg-brand-accent/15 text-brand-accent',
    gradient: 'from-orange-200 via-rose-100 to-amber-50',
    xp: 120,
    gems: 5,
  },
];

function StudioCourseCard({
  studioId, href, emoji, title, description, tag, tagBg, gradient, xp, gems,
}: StudioCard) {
  return (
    <Link href={href} className="group block">
      <motion.div
        className="overflow-hidden rounded-xl bg-white shadow-card"
        whileHover={{ y: -3, boxShadow: '0 12px 30px rgba(0,0,0,0.10)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Illustration */}
        <div className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${gradient}`}>
          <span className="text-6xl">{emoji}</span>

          {/* Launch-state pill — LAUNCH-001. Top-right of the illustration
              so it's visible without disturbing the existing XP/gems row
              along the bottom. */}
          <span className="absolute right-3 top-3">
            <StudioLaunchPill studioId={studioId} size="sm" />
          </span>

          {/* XP badges */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-brand-ai backdrop-blur-sm">
              💎 +{gems}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-brand-accent backdrop-blur-sm">
              🔥 +{xp}
            </span>
          </div>

          <div className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm">
            <span className="text-sm">🔥</span>
          </div>
        </div>

        {/* Info */}
        <div className="px-4 pb-4 pt-3">
          <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${tagBg}`}>
            {tag}
          </span>
          <h3 className="mt-1.5 font-display text-sm font-bold text-brand-text">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-brand-text-secondary">{description}</p>
        </div>
      </motion.div>
    </Link>
  );
}

export function StudioCardsColumn() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
        <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand-primary transition-colors hover:bg-brand-primary/15">
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand-primary transition-colors hover:bg-brand-primary/15">
          <Search className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Course cards */}
      {STUDIO_CARDS.map((s) => (
        <StudioCourseCard key={s.studioId} {...s} />
      ))}
    </div>
  );
}
