'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BEAT_THE_AI_CATEGORIES, SKILL_INFO, getDailyTheme } from '@/types/beatTheAi.types';
import type { BeatTheAiCategory } from '@/types/beatTheAi.types';

interface CategoryPickerProps {
  onSelect: (category: BeatTheAiCategory) => void;
  isLoading: boolean;
  onViewStats: () => void;
}

export function CategoryPicker({ onSelect, isLoading, onViewStats }: CategoryPickerProps) {
  const dailyTheme = useMemo(() => getDailyTheme(), []);

  // For "Surprise Sunday" (random), pick a stable random category for the day
  const featuredCategory = useMemo<BeatTheAiCategory>(() => {
    if (dailyTheme.category !== 'random') return dailyTheme.category;
    // Deterministic "random" based on date so it doesn't change on re-render
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return BEAT_THE_AI_CATEGORIES[seed % BEAT_THE_AI_CATEGORIES.length]!.id;
  }, [dailyTheme]);

  const featuredInfo = BEAT_THE_AI_CATEGORIES.find((c) => c.id === featuredCategory)!;

  return (
    <div className="space-y-5">
      {/* Daily Featured Banner */}
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onSelect(featuredCategory)}
        disabled={isLoading}
        className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 p-5 text-left shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
      >
        <div className="absolute -right-4 -top-4 text-7xl opacity-20 transition-transform group-hover:scale-110">
          {featuredInfo.icon}
        </div>
        <div className="relative">
          <span className="inline-block rounded-full bg-white/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            🔥 Today&apos;s Challenge
          </span>
          <h2 className="mt-2 text-xl font-extrabold text-white">
            {dailyTheme.themeName}
          </h2>
          <p className="mt-0.5 text-sm font-medium text-white/90">
            {dailyTheme.tagline}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold text-white">
              {featuredInfo.icon} {featuredInfo.name}
            </span>
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold text-white">
              ⏱ {Math.floor(featuredInfo.timeLimit / 60)}m
            </span>
          </div>
        </div>
      </motion.button>

      {/* 9-category grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BEAT_THE_AI_CATEGORIES.map((cat, i) => {
          const skill = SKILL_INFO[cat.primarySkill];
          const isFeatured = cat.id === featuredCategory;
          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(cat.id)}
              disabled={isLoading}
              className={`group relative flex flex-col items-start gap-2 rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50 ${
                isFeatured
                  ? 'border-amber-300 hover:border-amber-400 ring-1 ring-amber-200'
                  : 'border-gray-100 hover:border-purple-200'
              }`}
            >
              {isFeatured && (
                <span className="absolute -top-2 right-3 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                  TODAY
                </span>
              )}
              <span className="text-2xl sm:text-3xl">{cat.icon}</span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{cat.name}</h3>
                <p className="mt-0.5 text-[11px] leading-tight text-gray-500 line-clamp-2">
                  {cat.description}
                </p>
              </div>
              <div className="mt-auto flex w-full items-center gap-1.5 pt-2">
                <span className="text-xs">{skill.icon}</span>
                <span className={`text-[10px] font-medium ${skill.color}`}>
                  {skill.name}
                </span>
                <span className="ml-auto text-[10px] text-gray-400">
                  {Math.floor(cat.timeLimit / 60)}m{cat.timeLimit % 60 > 0 ? `${cat.timeLimit % 60}s` : ''}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="text-center">
        <button
          onClick={onViewStats}
          className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
        >
          View My Skills & Stats
        </button>
      </div>
    </div>
  );
}
