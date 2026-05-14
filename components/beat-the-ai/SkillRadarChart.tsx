'use client';

import { motion } from 'framer-motion';
import type { BeatTheAiSkills, BeatTheAiSkillId } from '@gsi/types';
import { SKILL_INFO } from '@gsi/types';

interface SkillRadarChartProps {
  skills: BeatTheAiSkills;
}

const SKILL_ORDER: BeatTheAiSkillId[] = [
  'creativity',
  'storytelling',
  'wordplay',
  'knowledge',
  'speedThinking',
  'culturalConnect',
];

// Wider-than-tall viewBox so the long horizontal labels
// ("Cultural Connect", "Storytelling", "Speed Thinking", "Wordplay")
// have room to breathe on the left/right edges.
const VIEW_W = 340;
const VIEW_H = 260;
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;
const RADIUS = 90;
const LABEL_OFFSET = 28; // Extra padding so labels don't clip the viewBox edges
const GRID_RINGS = 5; // Number of concentric grid rings
const MIN_R = 12; // Minimum radius so chart isn't invisible at 0 XP
const MAX_XP = 501; // Legend threshold — XP beyond this still shows full radius

function polarToCartesian(angle: number, radius: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [CENTER_X + radius * Math.cos(rad), CENTER_Y + radius * Math.sin(rad)];
}

export function SkillRadarChart({ skills }: SkillRadarChartProps) {
  const angleStep = 360 / SKILL_ORDER.length;

  // Build polygon points from continuous XP progress (not integer levels)
  const points = SKILL_ORDER.map((skillId, i) => {
    const xp = skills[skillId]?.xp ?? 0;
    const progress = Math.min(xp / MAX_XP, 1); // 0..1
    const r = MIN_R + progress * (RADIUS - MIN_R);
    return polarToCartesian(i * angleStep, r);
  });

  const polygonStr = points.map(([x, y]) => `${x},${y}`).join(' ');

  // Grid rings
  const rings = [1, 2, 3, 4, 5];

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full max-w-[340px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid rings */}
        {rings.map((ring) => {
          const r = (ring / GRID_RINGS) * RADIUS;
          const ringPoints = SKILL_ORDER.map((_, i) => polarToCartesian(i * angleStep, r));
          return (
            <polygon
              key={ring}
              points={ringPoints.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Axis lines */}
        {SKILL_ORDER.map((_, i) => {
          const [x, y] = polarToCartesian(i * angleStep, RADIUS);
          return (
            <line
              key={i}
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={x}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Skill polygon — uses brand-primary purple */}
        <motion.polygon
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          points={polygonStr}
          fill="rgba(91, 95, 255, 0.18)"
          stroke="rgb(91, 95, 255)"
          strokeWidth={2}
        />

        {/* Skill labels */}
        {SKILL_ORDER.map((skillId, i) => {
          const [x, y] = polarToCartesian(i * angleStep, RADIUS + LABEL_OFFSET);
          const info = SKILL_INFO[skillId];
          return (
            <text
              key={skillId}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-gray-500 text-[10px] font-medium"
            >
              {info.icon} {info.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
