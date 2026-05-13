'use client';

import { motion } from 'framer-motion';
import type { SkillArenaProgress, SkillArenaModule } from '@gsi/types';
import { MODULE_INFO } from '@gsi/types';
import { BandProgressCard } from './BandProgressCard';

interface ProgressDashboardProps {
  progress: SkillArenaProgress;
  isLoading: boolean;
  onBack: () => void;
}

const MODULES: SkillArenaModule[] = ['speaking', 'listening', 'thinking', 'reading'];

export function ProgressDashboard({ progress, isLoading, onBack }: ProgressDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Overall band */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 p-5 text-center"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-purple-500">Overall Band</p>
        <p className="mt-1 text-4xl font-bold text-gray-900">
          {progress.totalAssessments > 0 ? progress.overallBand : '—'}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          {progress.totalAssessments} assessment{progress.totalAssessments !== 1 ? 's' : ''} completed
        </p>
        {progress.totalPointsEarned > 0 && (
          <p className="mt-1 text-xs text-purple-500">
            {progress.totalPointsEarned} AI Points earned
          </p>
        )}
      </motion.div>

      {/* Module progress grid */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-gray-700">Module Progress</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MODULES.map((moduleId, i) => (
            <motion.div
              key={moduleId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <BandProgressCard progress={progress.modules[moduleId]} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Strongest & recommended */}
      {(progress.strongestModule || progress.recommendedModule) && (
        <div className="flex gap-3">
          {progress.strongestModule && (
            <div className="flex-1 rounded-xl border border-green-100 bg-green-50 p-3">
              <p className="text-[10px] font-medium text-green-600">Strongest</p>
              <p className="text-sm font-bold text-gray-800">
                {MODULE_INFO[progress.strongestModule].icon} {MODULE_INFO[progress.strongestModule].name}
              </p>
            </div>
          )}
          {progress.recommendedModule && (
            <div className="flex-1 rounded-xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-[10px] font-medium text-amber-600">Try Next</p>
              <p className="text-sm font-bold text-gray-800">
                {MODULE_INFO[progress.recommendedModule].icon} {MODULE_INFO[progress.recommendedModule].name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Back */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
        >
          Back to Modules
        </button>
      </div>
    </div>
  );
}
