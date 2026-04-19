'use client';

import { DIMENSION_LABELS, DIMENSIONS } from '@/lib/ceo/constants';
import { cn } from '@/lib/utils';
import type { CeoDimensionData, CeoDimensionKey } from '@/types';

interface DimensionRadarProps {
  dimensions: Record<CeoDimensionKey, CeoDimensionData>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_PX = { sm: 200, md: 320, lg: 480 } as const;

export function DimensionRadar({ dimensions, size = 'md', className }: DimensionRadarProps) {
  const px = SIZE_PX[size];
  const cx = px / 2;
  const cy = px / 2;
  const rMax = px / 2 - 32;

  const axes = DIMENSIONS.map((key, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / DIMENSIONS.length;
    return { key, angle };
  });

  const points = axes.map(({ key, angle }) => {
    const score = dimensions[key]?.score ?? 50;
    const r = (score / 100) * rMax;
    return {
      key,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      angle,
    };
  });

  const polygon = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const rings = [20, 40, 60, 80, 100];

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      className={cn('block', className)}
      role="img"
      aria-label="6-dimension CEO profile radar"
    >
      {rings.map((pct) => (
        <polygon
          key={pct}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={1}
          points={axes
            .map(({ angle }) => {
              const r = (pct / 100) * rMax;
              return `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
            })
            .join(' ')}
        />
      ))}

      {axes.map(({ angle, key }) => (
        <line
          key={key}
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(angle) * rMax}
          y2={cy + Math.sin(angle) * rMax}
          stroke="#E2E8F0"
          strokeWidth={1}
        />
      ))}

      <defs>
        <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5B5FFF" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#8A5CFF" stopOpacity={0.3} />
        </linearGradient>
      </defs>

      <polygon fill="url(#radar-fill)" stroke="#5B5FFF" strokeWidth={2} points={polygon} />

      {points.map((p) => (
        <circle key={p.key} cx={p.x} cy={p.y} r={3} fill="#5B5FFF" />
      ))}

      {axes.map(({ angle, key }) => {
        const lx = cx + Math.cos(angle) * (rMax + 18);
        const ly = cy + Math.sin(angle) * (rMax + 18);
        const trend = dimensions[key]?.trend ?? 'stable';
        const arrow = trend === 'up' ? ' ↑' : trend === 'down' ? ' ↓' : '';
        return (
          <text
            key={`l-${key}`}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-700"
            fontSize={size === 'sm' ? 9 : size === 'md' ? 11 : 13}
            fontWeight={600}
          >
            {DIMENSION_LABELS[key].name}
            {arrow}
          </text>
        );
      })}
    </svg>
  );
}
