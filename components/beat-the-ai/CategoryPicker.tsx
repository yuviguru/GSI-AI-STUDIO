'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BEAT_THE_AI_CATEGORIES, SKILL_INFO, getDailyTheme } from '@gsi/types';
import type { BeatTheAiCategory } from '@gsi/types';
import {
  Clock, ChevronRight, Flame, BarChart3, Zap,
} from 'lucide-react';

/** Image path + fallback gradient per category */
const CATEGORY_VISUALS: Record<BeatTheAiCategory, {
  image: string;
  gradient: string;
}> = {
  story_sprint:       { image: '/images/beat-the-ai/story-sprint.jpg', gradient: 'from-indigo-500 to-purple-600' },
  rhyme_time:         { image: '/images/beat-the-ai/rhyme-time.jpg', gradient: 'from-pink-400 to-rose-500' },
  fact_or_bluff:      { image: '/images/beat-the-ai/fact-bluff.jpg', gradient: 'from-amber-400 to-orange-500' },
  comeback_king:      { image: '/images/beat-the-ai/comback-king.jpg', gradient: 'from-yellow-400 to-amber-500' },
  explain_it:         { image: '/images/beat-the-ai/explain-it.jpg', gradient: 'from-sky-400 to-blue-500' },
  debate_champ:       { image: '/images/beat-the-ai/debate-champ.jpg', gradient: 'from-red-400 to-rose-500' },
  math_wizard:        { image: '/images/beat-the-ai/math-wizard.jpg', gradient: 'from-emerald-400 to-teal-500' },
  science_detective:  { image: '/images/beat-the-ai/science-detective.jpg', gradient: 'from-cyan-400 to-blue-500' },
  code_cracker:       { image: '/images/beat-the-ai/code-cracker.jpg', gradient: 'from-violet-400 to-purple-500' },
};

interface CategoryPickerProps {
  onSelect: (category: BeatTheAiCategory) => void;
  isLoading: boolean;
  onViewStats: () => void;
}

export function CategoryPicker({ onSelect, isLoading, onViewStats }: CategoryPickerProps) {
  const dailyTheme = useMemo(() => getDailyTheme(), []);

  const featuredCategory = useMemo<BeatTheAiCategory>(() => {
    if (dailyTheme.category !== 'random') return dailyTheme.category;
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return BEAT_THE_AI_CATEGORIES[seed % BEAT_THE_AI_CATEGORIES.length]!.id;
  }, [dailyTheme]);

  const featuredInfo = BEAT_THE_AI_CATEGORIES.find((c) => c.id === featuredCategory)!;
  const featuredVisual = CATEGORY_VISUALS[featuredCategory];

  return (
    <div className="space-y-5">
      {/* ── Hero Banner — Featured Daily Challenge ── */}
      <motion.button
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        onClick={() => onSelect(featuredCategory)}
        disabled={isLoading}
        className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-primary to-brand-ai text-left shadow-card transition-all hover:shadow-card-hover active:scale-[0.98] disabled:opacity-50"
      >
        {/* Background image overlay */}
        <div className="pointer-events-none absolute inset-0">
          <img
            src={featuredVisual.image}
            alt=""
            className="h-full w-full object-cover opacity-20 transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="relative flex items-center gap-5 p-6">
          {/* Left: text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200">
                Today&apos;s Challenge
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {dailyTheme.themeName}
            </h2>
            <p className="mt-1 text-sm font-medium text-white/70">
              {dailyTheme.tagline}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <Clock className="h-3 w-3" />
                {Math.floor(featuredInfo.timeLimit / 60)}m
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <Zap className="h-3 w-3" />
                {SKILL_INFO[featuredInfo.primarySkill].name}
              </span>
            </div>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm transition-all group-hover:bg-white/30">
              Play Now <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>

          {/* Right: featured image card */}
          <div className="hidden sm:block h-32 w-32 flex-shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/20 shadow-lg">
            <img
              src={featuredVisual.image}
              alt={featuredInfo.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        </div>
      </motion.button>

      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-brand-text">All Challenges</h3>
          <p className="text-xs text-brand-text-muted">Pick a category and show the AI who&apos;s boss</p>
        </div>
        <button
          onClick={onViewStats}
          className="flex items-center gap-1 text-xs font-semibold text-brand-primary transition-colors hover:text-brand-ai"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          My Stats
        </button>
      </div>

      {/* ── Category Cards — Game Pass tile grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BEAT_THE_AI_CATEGORIES.map((cat, i) => {
          const visual = CATEGORY_VISUALS[cat.id];
          const skill = SKILL_INFO[cat.primarySkill];
          const isFeatured = cat.id === featuredCategory;

          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              onClick={() => onSelect(cat.id)}
              disabled={isLoading}
              className={`group relative flex flex-col overflow-hidden rounded-xl bg-white text-left shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 ${
                isFeatured ? 'ring-2 ring-brand-accent' : ''
              }`}
            >
              {/* Image top section */}
              <div className={`relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br ${visual.gradient}`}>
                <img
                  src={visual.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {isFeatured && (
                  <span className="absolute right-2 top-2 rounded-full bg-brand-accent px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                    TODAY
                  </span>
                )}
              </div>

              {/* White bottom section with info */}
              <div className="flex flex-1 flex-col px-3 py-3">
                <h4 className="font-display text-sm font-bold text-brand-text">{cat.name}</h4>
                <p className="mt-0.5 text-[11px] leading-snug text-brand-text-muted line-clamp-2">
                  {cat.description}
                </p>
                <div className="mt-auto flex items-center gap-1.5 border-t border-gray-100 pt-2 mt-2">
                  <span className={`text-[10px] font-medium ${skill.color}`}>{skill.icon} {skill.name}</span>
                  <span className="ml-auto flex items-center gap-0.5 text-[10px] text-brand-text-muted">
                    <Clock className="h-2.5 w-2.5" />
                    {Math.floor(cat.timeLimit / 60)}m{cat.timeLimit % 60 > 0 ? `${cat.timeLimit % 60}s` : ''}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
