'use client';

import { motion } from 'framer-motion';
import type { BeatTheAiSkills, BeatTheAiSkillId } from '@/types/beatTheAi.types';
import { SKILL_INFO } from '@/types/beatTheAi.types';

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

const SIZE = 200;
const CENTER = SIZE / 2;
const MAX_LEVEL = 5;
const RADIUS = 70;

function polarToCartesian(angle: number, radius: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

export function SkillRadarChart({ skills }: SkillRadarChartProps) {
  const angleStep = 360 / SKILL_ORDER.length;

  // Build polygon points from skill levels
  const points = SKILL_ORDER.map((skillId, i) => {
    const level = skills[skillId]?.level ?? 1;
    const r = (level / MAX_LEVEL) * RADIUS;
    return polarToCartesian(i * angleStep, r);
  });

  const polygonStr = points.map(([x, y]) => `${x},${y}`).join(' ');

  // Grid rings
  const rings = [1, 2, 3, 4, 5];

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        {/* Grid rings */}
        {rings.map((ring) => {
          const r = (ring / MAX_LEVEL) * RADIUS;
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
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Skill polygon */}
        <motion.polygon
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          points={polygonStr}
          fill="rgba(147, 51, 234, 0.2)"
          stroke="rgb(147, 51, 234)"
          strokeWidth={2}
        />

        {/* Skill labels */}
        {SKILL_ORDER.map((skillId, i) => {
          const [x, y] = polarToCartesian(i * angleStep, RADIUS + 20);
          const info = SKILL_INFO[skillId];
          return (
            <text
              key={skillId}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[8px] fill-gray-500"
            >
              {info.icon} {info.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
