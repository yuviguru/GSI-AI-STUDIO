'use client';

import { motion } from 'framer-motion';
import { BEAT_THE_AI_CATEGORIES, SKILL_INFO } from '@/types/beatTheAi.types';
import type { BeatTheAiCategory } from '@/types/beatTheAi.types';

interface CategoryPickerProps {
  onSelect: (category: BeatTheAiCategory) => void;
  isLoading: boolean;
  onViewStats: () => void;
}

export function CategoryPicker({ onSelect, isLoading, onViewStats }: CategoryPickerProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {BEAT_THE_AI_CATEGORIES.map((cat, i) => {
          const skill = SKILL_INFO[cat.primarySkill];
          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => onSelect(cat.id)}
              disabled={isLoading}
              className="group relative flex flex-col items-start gap-2 rounded-2xl border-2 border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-purple-200 hover:shadow-md active:scale-[0.97] disabled:opacity-50"
            >
              <span className="text-3xl">{cat.icon}</span>
              <div>
                <h3 className="font-bold text-gray-900">{cat.name}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{cat.description}</p>
              </div>
              <div className="mt-auto flex items-center gap-1.5 pt-2">
                <span className="text-xs">{skill.icon}</span>
                <span className={`text-[10px] font-medium ${skill.color}`}>
                  {skill.name}
                </span>
                <span className="ml-auto text-[10px] text-gray-400">
                  {Math.floor(cat.timeLimit / 60)}m
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
