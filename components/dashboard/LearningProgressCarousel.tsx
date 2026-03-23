'use client';

import { useAiPoints } from '@/contexts/AiPointsContext';

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 88 28" fill="none" className="h-7 w-[88px] shrink-0">
      <polyline
        points="0,25 14,19 28,22 42,13 56,9 70,6 88,2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.75"
      />
    </svg>
  );
}

// ─── Level helpers ────────────────────────────────────────────────────────────

const LEVELS = [
  { min: 0, max: 99 },
  { min: 100, max: 249 },
  { min: 250, max: 499 },
  { min: 500, max: 999 },
  { min: 1000, max: Infinity },
];

function levelPct(points: number): number {
  const idx = Math.max(0, LEVELS.findIndex((l) => points >= l.min && points <= l.max));
  const level = LEVELS[idx] ?? LEVELS[LEVELS.length - 1]!;
  const next = LEVELS[idx + 1];
  return next ? Math.round(((points - level.min) / (next.min - level.min)) * 100) : 100;
}

// ─── Single progress card ─────────────────────────────────────────────────────

interface ProgressCardProps {
  icon: string;
  label: string;
  fraction: string;
  percentage: number;
  subtitle: string;
  description: string;
  variant: 'white' | 'purple';
}

function ProgressCard({ icon, label, fraction, percentage, subtitle, description, variant }: ProgressCardProps) {
  const isPurple = variant === 'purple';

  return (
    <div
      className={`min-w-0 flex-1 rounded-xl p-3.5 ${
        isPurple ? 'bg-violet-100' : 'bg-white shadow-card'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{icon}</span>
          <span className={`text-[11px] font-semibold ${isPurple ? 'text-violet-700' : 'text-gray-500'}`}>
            {label}
          </span>
        </div>
        <span className={`shrink-0 font-mono text-[11px] font-bold ${isPurple ? 'text-violet-500' : 'text-gray-400'}`}>
          {fraction}
        </span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-1">
        <p className={`font-mono text-4xl font-extrabold leading-none ${isPurple ? 'text-violet-900' : 'text-gray-900'}`}>
          {percentage}%
        </p>
        <Sparkline color={isPurple ? '#7C3AED' : '#5B5FFF'} />
      </div>

      <p className={`mt-2 text-xs font-bold ${isPurple ? 'text-violet-800' : 'text-gray-700'}`}>
        {subtitle}
      </p>
      <p className={`mt-0.5 text-[10px] leading-tight ${isPurple ? 'text-violet-600/80' : 'text-gray-400'}`}>
        {description}
      </p>
    </div>
  );
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

export function LearningProgressCarousel() {
  const { totalPoints, creationsByType } = useAiPoints();
  const xpPct = levelPct(totalPoints);
  const totalCreations = Object.values(creationsByType).reduce((s, n) => s + n, 0);
  const creationPct = Math.min(100, Math.round((totalCreations / 10) * 100));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-gray-900">Learning progress</h3>
        <button className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-400 shadow-card hover:text-gray-600">
          ›
        </button>
      </div>

      <div className="mt-3 flex gap-3">
        <ProgressCard
          icon="⭐"
          label="XP Progress"
          fraction={`${totalPoints} pts`}
          percentage={xpPct}
          subtitle="XP strategy"
          description="Open AI X-Ray after each creation to level up faster"
          variant="white"
        />
        <ProgressCard
          icon="🎨"
          label="Creations"
          fraction={`${totalCreations}/10`}
          percentage={creationPct}
          subtitle="Creator strategy"
          description="Make 10 AI creations to unlock the milestone badge"
          variant="purple"
        />
      </div>

      {/* Carousel dots */}
      <div className="mt-3 flex justify-center gap-1.5">
        <div className="h-1.5 w-4 rounded-full bg-brand-purple" />
        <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}
