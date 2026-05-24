'use client';

import { useAiPoints } from '@/contexts/AiPointsContext';
import { useResolvedIdentity } from '@/hooks/useResolvedIdentity';

// Placeholder leaderboard data — to be wired to real backend later.
const TOP_3 = [
  { rank: 1, name: 'Karthik', emoji: '🦊', xp: 4820, color: 'from-amber-400 to-yellow-500', bg: 'from-amber-100/80 to-yellow-50', ring: 'ring-amber-200/60', text: 'text-amber-700' },
  { rank: 2, name: 'Meera',   emoji: '🐯', xp: 3945, color: 'from-slate-300 to-slate-400', bg: 'from-slate-100/80 to-slate-50',   ring: 'ring-slate-200',   text: 'text-slate-700' },
  { rank: 3, name: 'Rohan',   emoji: '🦁', xp: 3720, color: 'from-orange-400 to-amber-600', bg: 'from-orange-100/80 to-orange-50', ring: 'ring-orange-200/60', text: 'text-orange-700' },
];

export function LeaderboardCard() {
  const { totalPoints } = useAiPoints();
  // useResolvedIdentity gives us avatarUrl + mascotEmoji + name from the
  // canonical precedence chain. The legacy `kid.avatar` string field (e.g.
  // "parrot") is intentionally NOT used here — it was a pre-mascot text
  // label that would render as plain text in the emoji slot.
  const {
    name: youName,
    avatarUrl: youAvatarUrl,
    mascotEmoji: youMascotEmoji,
  } = useResolvedIdentity();

  return (
    <div className="game-hud-frame game-glass shrink-0 rounded-lg p-3 shadow-glass">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-display text-[11px] font-bold uppercase tracking-wider">🏅 Weekly Rank</div>
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-brand-secondary">LIVE</span>
      </div>

      <div className="space-y-1.5">
        {TOP_3.map((p) => (
          <div
            key={p.rank}
            className={`flex items-center gap-2 rounded-lg bg-gradient-to-r ${p.bg} p-1.5 ring-1 ${p.ring}`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${p.color} font-display text-xs font-black text-white shadow-md`}
            >
              {p.rank}
            </div>
            <div className="text-base">{p.emoji}</div>
            <div className="min-w-0 flex-1 truncate text-[11px] font-bold">{p.name}</div>
            <div className={`font-mono text-[10px] font-bold ${p.text}`}>{p.xp.toLocaleString()}</div>
          </div>
        ))}

        <div className="my-1 flex items-center gap-1.5">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-brand-primary/20" />
          <div className="font-mono text-[9px] tracking-widest text-brand-text-secondary">···</div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-brand-primary/20" />
        </div>

        {/* Player row */}
        <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-100/80 to-violet-50 p-1.5 ring-2 ring-brand-primary/40">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-ai font-display text-xs font-black text-white shadow-md">
            12
          </div>
          {youAvatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={youAvatarUrl}
              alt={youName}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/60 text-base">
              {youMascotEmoji}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-bold text-brand-primary">{youName}</div>
            <div className="text-[9px] text-brand-text-secondary">↑3 this week</div>
          </div>
          <div className="font-mono text-[10px] font-bold text-brand-primary">
            {totalPoints.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
