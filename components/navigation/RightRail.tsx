'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Bell, Mail, Sparkles, Award, Flame } from 'lucide-react';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { getAvatarEmoji } from '@/components/profile/AvatarPicker';

export function RightRail() {
  const { activeKid } = useKidProfile();
  const { totalPoints, badges, creationsByType } = useAiPoints();
  const streak = activeKid?.streak?.current ?? 0;

  const inProgress = Object.entries(creationsByType ?? {})
    .filter(([, count]) => count > 0)
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));

  return (
    <aside className="flex flex-col gap-4">
      {/* Profile chip */}
      <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-card">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-xl">
            {activeKid ? getAvatarEmoji(activeKid.avatar) : '🐣'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-text leading-tight">
              {activeKid?.name ?? 'Guest'}
            </p>
            <p className="text-[11px] font-medium text-brand-text-secondary">
              Level {Math.floor(totalPoints / 50) + 1}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-brand-text-secondary transition hover:bg-gray-100"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Messages"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-brand-text-secondary transition hover:bg-gray-100"
          >
            <Mail className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Today's Activity */}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <h3 className="font-display text-sm font-bold text-brand-text">Today&apos;s Activity</h3>
        <p className="text-[11px] text-brand-text-secondary">Pick up where you left off</p>

        <div className="mt-3 flex flex-col gap-3">
          {inProgress.length === 0 ? (
            <p className="rounded-xl bg-gray-50 px-3 py-3 text-xs text-brand-text-secondary">
              Nothing in progress yet — start a studio to see it here.
            </p>
          ) : (
            inProgress.map(({ type, count }) => {
              const progress = Math.min(100, (count % 5) * 20 + 20);
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold capitalize text-brand-text">
                      {type}
                    </p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-semibold text-brand-text-secondary">
                    {progress}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Daily Challenge promo card */}
      <Link
        href="/beat-the-ai"
        className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 via-pink-400 to-rose-400 p-4 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
      >
        <div className="absolute -right-2 -top-2 h-24 w-24">
          <Image
            src="/illustrations/cta/daily-challenge.svg"
            alt=""
            aria-hidden="true"
            width={96}
            height={96}
            className="h-full w-full object-contain drop-shadow-md"
          />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wider text-white/85">
          Daily Challenge
        </p>
        <h3 className="mt-1 max-w-[60%] font-display text-base font-bold leading-tight">
          Beat the AI today!
        </h3>
        <p className="mt-1 max-w-[60%] text-[11px] text-white/85">
          Win 30 AI Points
        </p>

        <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-rose-600 shadow-sm">
          Play now →
        </span>
      </Link>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          icon={<Sparkles className="h-4 w-4" />}
          label="AI Points"
          value={totalPoints}
          accent="bg-violet-100 text-violet-600"
        />
        <StatTile
          icon={<Award className="h-4 w-4" />}
          label="Badges"
          value={badges?.length ?? 0}
          accent="bg-amber-100 text-amber-600"
        />
        <StatTile
          icon={<Flame className="h-4 w-4" />}
          label="Streak"
          value={streak}
          suffix="d"
          accent="bg-rose-100 text-rose-600"
        />
      </div>
    </aside>
  );
}

function StatTile({
  icon,
  label,
  value,
  suffix,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl bg-white p-3 shadow-card">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="font-mono text-base font-bold text-brand-text">
          {value}
          {suffix && <span className="ml-0.5 text-xs text-brand-text-secondary">{suffix}</span>}
        </p>
        <p className="text-[10px] font-medium text-brand-text-secondary">{label}</p>
      </div>
    </div>
  );
}
