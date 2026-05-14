'use client';

import { motion } from 'framer-motion';
import { MODULE_INFO } from '@gsi/types';
import type { SkillArenaModule, SkillArenaModuleProgress } from '@gsi/types';

interface ModulePickerProps {
  onSelect: (module: SkillArenaModule) => void;
  isLoading: boolean;
  moduleProgress?: Record<SkillArenaModule, SkillArenaModuleProgress>;
  onViewProgress: () => void;
}

const MODULES: SkillArenaModule[] = ['speaking', 'listening', 'thinking', 'reading'];

export function ModulePicker({ onSelect, isLoading, moduleProgress, onViewProgress }: ModulePickerProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {MODULES.map((moduleId, i) => {
          const info = MODULE_INFO[moduleId];
          const progress = moduleProgress?.[moduleId];
          const isNew = !progress || progress.assessments === 0;

          return (
            <motion.button
              key={moduleId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => onSelect(moduleId)}
              disabled={isLoading}
              className="group relative flex flex-col items-start gap-2 rounded-2xl border-2 border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-purple-200 hover:shadow-md active:scale-[0.97] disabled:opacity-50"
            >
              {isNew && (
                <span className="absolute -right-1 -top-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  New!
                </span>
              )}
              <span className="text-3xl">{info.icon}</span>
              <div>
                <h3 className="font-bold text-gray-900">{info.name}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{info.description}</p>
              </div>
              <div className="mt-auto flex w-full items-center gap-1.5 pt-2">
                {!isNew && progress && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                    Band {progress.band}
                  </span>
                )}
                {info.requiresMic && (
                  <span className="text-[10px] text-gray-400">Mic needed</span>
                )}
                <span className="ml-auto text-[10px] text-gray-400">
                  ~{info.estimatedTime}m
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="text-center">
        <button
          onClick={onViewProgress}
          className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
        >
          View My Progress
        </button>
      </div>
    </div>
  );
}
