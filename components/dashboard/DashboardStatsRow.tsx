'use client';

import Link from 'next/link';
import { Target, Lightbulb, Zap, Trophy, Star, Crosshair, Flame } from 'lucide-react';
import { useAiPoints } from '@/contexts/AiPointsContext';

/* ─── Single stat card ─────────────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  cardBg: string;
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg, cardBg }: StatCardProps) {
  return (
    <div className={`rounded-xl ${cardBg} px-5 py-5 shadow-card`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-brand-text-secondary">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
        </div>
      </div>
      <p className="mt-3 font-mono text-3xl font-extrabold tracking-tight text-brand-text">
        {value}
      </p>
    </div>
  );
}

/* ─── Badges stat card (same height as stat cards) ─────────────────────────── */

const PLACEHOLDER_BADGES = [
  { icon: Trophy, label: 'Trophy' },
  { icon: Star, label: 'Star' },
  { icon: Crosshair, label: 'Crosshair' },
  { icon: Flame, label: 'Flame' },
];

function BadgesStatCard({ count }: { count: number }) {
  return (
    <div className="rounded-xl bg-purple-50 px-5 py-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-brand-text-secondary">Badges</p>
          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft font-mono text-[9px] font-bold text-brand-primary">
            {count}
          </span>
        </div>
        <Link href="/creations" className="text-[11px] font-semibold text-brand-text-secondary hover:text-brand-primary">
          View all &rsaquo;
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {PLACEHOLDER_BADGES.map((badge, i) => {
          const BadgeIcon = badge.icon;
          return (
            <div
              key={i}
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                i < count ? 'bg-amber-50' : 'bg-gray-100 opacity-40 grayscale'
              }`}
            >
              <BadgeIcon className="h-[18px] w-[18px] text-amber-600" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Stats row — 4 equal cards ────────────────────────────────────────────── */

export function DashboardStatsRow() {
  const { totalPoints, conceptsLearned, creationsByType, badges } = useAiPoints();
  const totalCreations = Object.values(creationsByType).reduce((s, n) => s + n, 0);
  const completionPct = Math.min(100, Math.round((totalCreations / 10) * 100));

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        label="Completed"
        value={`${completionPct}%`}
        icon={Target}
        iconColor="text-blue-600"
        iconBg="bg-blue-200/60"
        cardBg="bg-blue-50"
      />
      <StatCard
        label="Concepts"
        value={`${conceptsLearned.length}/12`}
        icon={Lightbulb}
        iconColor="text-amber-600"
        iconBg="bg-amber-200/60"
        cardBg="bg-amber-50"
      />
      <StatCard
        label="XP Points"
        value={`${totalPoints}`}
        icon={Zap}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-200/60"
        cardBg="bg-emerald-50"
      />
      <BadgesStatCard count={badges.length} />
    </div>
  );
}
