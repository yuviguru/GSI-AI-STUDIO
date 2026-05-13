'use client';

import type { SkillArenaModuleProgress, SkillArenaModule } from '@gsi/types';
import { MODULE_INFO, SKILL_ARENA_BANDS } from '@gsi/types';

interface BandProgressCardProps {
  progress: SkillArenaModuleProgress;
}

const TREND_INDICATORS = {
  improving: { icon: '📈', label: 'Improving', color: 'text-green-600' },
  stable: { icon: '➡️', label: 'Stable', color: 'text-gray-500' },
  new: { icon: '✨', label: 'New', color: 'text-purple-500' },
};

export function BandProgressCard({ progress }: BandProgressCardProps) {
  const moduleInfo = MODULE_INFO[progress.module];
  const bandInfo = SKILL_ARENA_BANDS.find((b) => b.band === progress.band);
  const trend = TREND_INDICATORS[progress.trend];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{moduleInfo.icon}</span>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-gray-800">{moduleInfo.name}</h4>
          <div className="flex items-center gap-2">
            {progress.assessments > 0 ? (
              <>
                <span className="text-xs font-semibold text-purple-600">
                  Band {progress.band} — {progress.bandTitle}
                </span>
                <span className={`text-[10px] ${trend.color}`}>
                  {trend.icon} {trend.label}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400">Not attempted yet</span>
            )}
          </div>
        </div>
        {progress.assessments > 0 && (
          <div className="text-right">
            <p className="text-lg font-bold text-gray-700">{progress.score}</p>
            <p className="text-[10px] text-gray-400">{progress.assessments} taken</p>
          </div>
        )}
      </div>
    </div>
  );
}
