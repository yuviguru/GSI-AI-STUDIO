'use client';

interface XpBarProps {
  percent: number; // 0-100
  height?: number; // px
  /** Override fill gradient (e.g. amber for warning quests). */
  fillStyle?: string;
}

export function XpBar({ percent, height = 8, fillStyle }: XpBarProps) {
  const safe = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="game-progress-bar relative overflow-hidden rounded-full bg-brand-primary/10"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${safe}%`,
          background: fillStyle ?? 'linear-gradient(90deg, #5B5FFF, #8A5CFF)',
          boxShadow: '0 0 6px rgba(91,95,255,0.5)',
        }}
      />
    </div>
  );
}
