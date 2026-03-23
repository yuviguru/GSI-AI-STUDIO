'use client';

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  score: number;
  avatarBg: string;
}

const TOP_3: LeaderboardEntry[] = [
  { rank: 2, name: 'Priya S.',  avatar: '👧', score: 48105, avatarBg: 'bg-cyan-100'   },
  { rank: 1, name: 'Arjun K.',  avatar: '🧑', score: 65322, avatarBg: 'bg-amber-100'  },
  { rank: 3, name: 'Meera R.',  avatar: '👩', score: 21780, avatarBg: 'bg-rose-100'   },
];

const REST: LeaderboardEntry[] = [
  { rank: 4, name: 'Rohan M.',   avatar: '👦', score: 19231, avatarBg: 'bg-emerald-100' },
  { rank: 5, name: 'Ananya P.',  avatar: '👧', score: 15322, avatarBg: 'bg-violet-100'  },
  { rank: 6, name: 'Vikram S.',  avatar: '🧑', score: 15101, avatarBg: 'bg-blue-100'    },
  { rank: 7, name: 'Kavya D.',   avatar: '👩', score: 13899, avatarBg: 'bg-orange-100'  },
  { rank: 8, name: 'Dev A.',     avatar: '👦', score: 12466, avatarBg: 'bg-teal-100'    },
];

function PodiumColumn({ entry, height, scoreBg }: { entry: LeaderboardEntry; height: number; scoreBg: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${entry.avatarBg} ring-2 ring-white`}>
        {entry.avatar}
      </div>
      <p className="max-w-[64px] truncate text-center text-[11px] font-semibold text-brand-text">
        {entry.name}
      </p>
      <div
        className={`flex w-full items-start justify-center rounded-t-lg ${
          entry.rank === 1 ? 'bg-amber-100' : entry.rank === 2 ? 'bg-blue-100' : 'bg-rose-100'
        }`}
        style={{ height }}
      >
        <span className="mt-1.5 font-display text-base font-extrabold text-brand-text/40">
          #{entry.rank}
        </span>
      </div>
      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-white ${scoreBg}`}>
        {entry.score.toLocaleString()}
      </span>
    </div>
  );
}

function RankRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-brand-soft/50">
      <span className="w-5 text-center font-mono text-xs font-bold text-brand-text-muted">
        #{entry.rank}
      </span>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${entry.avatarBg}`}>
        {entry.avatar}
      </div>
      <p className="flex-1 truncate text-xs font-semibold text-brand-text">{entry.name}</p>
      <span className="rounded-full bg-brand-secondary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-secondary">
        {entry.score.toLocaleString()}
      </span>
    </div>
  );
}

export function LeaderboardPanel() {
  return (
    <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-card">
      <h2 className="font-display text-base font-bold text-brand-text">Leaderboard</h2>

      <div className="mt-4 grid grid-cols-3 items-end gap-1.5">
        <PodiumColumn entry={TOP_3[0]!} height={64} scoreBg="bg-brand-secondary" />
        <PodiumColumn entry={TOP_3[1]!} height={84} scoreBg="bg-brand-secondary" />
        <PodiumColumn entry={TOP_3[2]!} height={48} scoreBg="bg-rose-400" />
      </div>

      <div className="my-3 h-px bg-gray-100" />

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {REST.map((e) => (
          <RankRow key={e.rank} entry={e} />
        ))}
      </div>
    </div>
  );
}
