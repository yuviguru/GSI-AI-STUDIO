'use client';

import { useAiPoints } from '@/contexts/AiPointsContext';
import { useResolvedIdentity } from '@/hooks/useResolvedIdentity';

const PODIUM = [
  // Order: 2nd, 1st, 3rd for the podium layout
  { rank: 2, name: 'Meera',   emoji: '🐯', xp: 3945, height: 40, gradient: 'from-slate-300 to-slate-200', medal: 'from-slate-300 to-slate-400', textColor: 'text-slate-700' },
  { rank: 1, name: 'Karthik', emoji: '🦊', xp: 4820, height: 56, gradient: 'from-amber-400 to-yellow-300', medal: 'from-amber-400 to-yellow-500', textColor: 'text-amber-700' },
  { rank: 3, name: 'Rohan',   emoji: '🦁', xp: 3720, height: 28, gradient: 'from-orange-300 to-orange-200', medal: 'from-orange-400 to-amber-600', textColor: 'text-orange-700' },
];

const REST = [
  { rank: 4, name: 'Priya', emoji: '🐱', xp: 3210 },
  { rank: 5, name: 'Aisha', emoji: '🐼', xp: 3084 },
  { rank: 6, name: 'Vikram', emoji: '🦝', xp: 2956 },
  { rank: 7, name: 'Nisha', emoji: '🐨', xp: 2891 },
];

export function RanksScene() {
  const { totalPoints } = useAiPoints();
  // useResolvedIdentity gives us avatarUrl + mascotEmoji + name from the
  // canonical precedence chain. Legacy `kid.avatar` string field (e.g.
  // "parrot") is intentionally not used in the emoji slot.
  const {
    name: youName,
    avatarUrl: youAvatarUrl,
    mascotEmoji: youMascotEmoji,
  } = useResolvedIdentity();

  return (
    <div className="flex h-full flex-col">
      {/* Title */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <div>
          <div className="font-display text-lg font-bold">Weekly Ranks</div>
          <div className="text-[10px] text-brand-text-secondary">Resets in 3d 14h</div>
        </div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
          ● LIVE
        </span>
      </div>

      {/* Podium */}
      <div className="shrink-0 px-4 pt-3">
        <div className="game-hud-frame game-glass relative overflow-hidden rounded-lg p-4 shadow-md">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl" />
          <div className="relative flex items-end justify-center gap-3">
            {PODIUM.map((p) => (
              <div key={p.rank} className="flex flex-col items-center">
                {p.rank === 1 && <div className="text-[10px]">👑</div>}
                <div className={p.rank === 1 ? 'text-4xl' : 'text-3xl'}>{p.emoji}</div>
                <div
                  className={`mt-1 flex items-center justify-center rounded-full bg-gradient-to-br ${p.medal} font-display font-black text-white shadow-md ${p.rank === 1 ? 'h-7 w-7 text-sm' : 'h-6 w-6 text-xs'}`}
                >
                  {p.rank}
                </div>
                <div className={`mt-1 font-bold ${p.rank === 1 ? 'text-[11px] text-amber-800' : 'text-[10px]'}`}>
                  {p.name}
                </div>
                <div className={`font-mono ${p.rank === 1 ? 'text-[10px] font-bold' : 'text-[9px]'} ${p.textColor}`}>
                  {p.xp.toLocaleString()}
                </div>
                <div
                  className={`mt-1 w-12 rounded-t-lg bg-gradient-to-t ${p.gradient}`}
                  style={{ height: p.height }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Your rank highlight */}
      <div className="shrink-0 px-4 pt-3">
        <div className="rounded-lg bg-gradient-to-r from-brand-primary to-brand-ai p-0.5 shadow-md">
          <div className="flex items-center gap-3 rounded-[14px] bg-white p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-ai font-display text-sm font-black text-white">
              12
            </div>
            {youAvatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={youAvatarUrl}
                alt={youName}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 text-2xl">
                {youMascotEmoji}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold text-brand-primary">You · {youName}</div>
              <div className="text-[10px] font-semibold text-brand-secondary">↑ 3 places this week</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-base font-bold text-brand-primary">
                {totalPoints.toLocaleString()}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-brand-text-secondary">XP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of top players */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-2 pt-3">
        <div className="mb-1.5 shrink-0 font-display text-[11px] font-bold uppercase tracking-wider">
          Top Players
        </div>
        <div className="game-glass flex flex-1 flex-col gap-1 rounded-lg p-2">
          {REST.map((p) => (
            <div key={p.rank} className="flex items-center gap-2 rounded-lg p-1.5">
              <span className="w-4 font-mono text-[10px] font-bold text-brand-text-secondary">{p.rank}</span>
              <span className="text-lg">{p.emoji}</span>
              <span className="flex-1 truncate text-[11px] font-semibold">{p.name}</span>
              <span className="font-mono text-[10px] font-bold">{p.xp.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
