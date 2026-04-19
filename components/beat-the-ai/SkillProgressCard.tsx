'use client';

import type { BeatTheAiSkillId, SkillLevel } from '@/types/beatTheAi.types';
import { SKILL_INFO, SKILL_LEVELS } from '@/types/beatTheAi.types';

interface SkillProgressCardProps {
  skillId: BeatTheAiSkillId;
  skill: SkillLevel;
}

const LEVEL_BADGES: Record<string, string> = {
  seed: '🌱',
  sprout: '🌿',
  tree: '🌳',
  star: '⭐',
  crown: '👑',
};

export function SkillProgressCard({ skillId, skill }: SkillProgressCardProps) {
  const info = SKILL_INFO[skillId];
  const levelData = SKILL_LEVELS[skill.level - 1];
  const badge = levelData ? LEVEL_BADGES[levelData.badge] : '🌱';

  const progress = skill.nextLevelXp > 0
    ? Math.min(100, (skill.xp / skill.nextLevelXp) * 100)
    : 100;

  return (
    <div className="rounded-xl bg-white p-3 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-lg">{info.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-brand-text">{info.name}</h4>
            <span className="text-sm">{badge}</span>
          </div>
          <p className="text-[10px] text-brand-text-muted">
            Lv.{skill.level} {skill.title}
          </p>
        </div>
        <span className="text-xs font-semibold text-brand-primary">{skill.xp} XP</span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-soft">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-ai transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {skill.nextLevelXp > 0 && (
        <p className="mt-1 text-right text-[10px] text-brand-text-muted">
          {skill.nextLevelXp - skill.xp} XP to next level
        </p>
      )}
    </div>
  );
}
