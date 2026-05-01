'use client';

import { useEffect, useState } from 'react';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string | null;
  mascotId: string | null;
  score: number;
  /** Visual fallback emoji + bg when no avatar/mascot is set. */
  fallbackEmoji?: string;
  fallbackBg?: string;
}

interface LeaderboardApiEntry {
  rank: number;
  kidId: string;
  name: string;
  avatar: string | null;
  mascotId: string | null;
  score: number;
}

const FALLBACK_TOP_3: LeaderboardEntry[] = [
  { rank: 2, name: 'Priya S.', avatar: null, mascotId: null, score: 48105, fallbackEmoji: '👧', fallbackBg: 'bg-cyan-100' },
  { rank: 1, name: 'Arjun K.', avatar: null, mascotId: null, score: 65322, fallbackEmoji: '🧑', fallbackBg: 'bg-amber-100' },
  { rank: 3, name: 'Meera R.', avatar: null, mascotId: null, score: 21780, fallbackEmoji: '👩', fallbackBg: 'bg-rose-100' },
];

const FALLBACK_REST: LeaderboardEntry[] = [
  { rank: 4, name: 'Rohan M.', avatar: null, mascotId: null, score: 19231, fallbackEmoji: '👦', fallbackBg: 'bg-emerald-100' },
  { rank: 5, name: 'Ananya P.', avatar: null, mascotId: null, score: 15322, fallbackEmoji: '👧', fallbackBg: 'bg-violet-100' },
  { rank: 6, name: 'Vikram S.', avatar: null, mascotId: null, score: 15101, fallbackEmoji: '🧑', fallbackBg: 'bg-blue-100' },
  { rank: 7, name: 'Kavya D.', avatar: null, mascotId: null, score: 13899, fallbackEmoji: '👩', fallbackBg: 'bg-orange-100' },
  { rank: 8, name: 'Dev A.', avatar: null, mascotId: null, score: 12466, fallbackEmoji: '👦', fallbackBg: 'bg-teal-100' },
];

const FALLBACK_BG_ROTATION = [
  'bg-cyan-100',
  'bg-amber-100',
  'bg-rose-100',
  'bg-emerald-100',
  'bg-violet-100',
  'bg-blue-100',
  'bg-orange-100',
  'bg-teal-100',
];

const FALLBACK_EMOJI_ROTATION = ['👧', '🧑', '👩', '👦'];

function decorate(entry: LeaderboardApiEntry): LeaderboardEntry {
  const idx = (entry.rank - 1) % FALLBACK_BG_ROTATION.length;
  return {
    ...entry,
    fallbackEmoji: FALLBACK_EMOJI_ROTATION[idx % FALLBACK_EMOJI_ROTATION.length]!,
    fallbackBg: FALLBACK_BG_ROTATION[idx]!,
  };
}

function AvatarTile({ entry, size = 'md' }: { entry: LeaderboardEntry; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-8 w-8 text-base' : 'h-11 w-11 text-xl';

  if (entry.avatar) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={entry.avatar}
        alt={entry.name}
        className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  if (entry.mascotId) {
    return <MascotAvatar id={entry.mascotId} size={size === 'sm' ? 'sm' : 'md'} tile />;
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full ring-2 ring-white ${entry.fallbackBg ?? 'bg-gray-100'}`}
    >
      {entry.fallbackEmoji ?? '👤'}
    </div>
  );
}

function PodiumColumn({
  entry,
  height,
  scoreBg,
}: {
  entry: LeaderboardEntry;
  height: number;
  scoreBg: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <AvatarTile entry={entry} />
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
      <AvatarTile entry={entry} size="sm" />
      <p className="flex-1 truncate text-xs font-semibold text-brand-text">{entry.name}</p>
      <span className="rounded-full bg-brand-secondary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-secondary">
        {entry.score.toLocaleString()}
      </span>
    </div>
  );
}

function buildPodium(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  if (entries.length < 3) return entries;
  // Layout order: 2nd, 1st, 3rd
  return [entries[1]!, entries[0]!, entries[2]!];
}

export function LeaderboardPanel() {
  const [top, setTop] = useState<LeaderboardEntry[]>(buildPodium(FALLBACK_TOP_3));
  const [rest, setRest] = useState<LeaderboardEntry[]>(FALLBACK_REST);
  const [isMock, setIsMock] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.data?.fromFirestore && json.data.entries.length >= 3) {
          const entries = (json.data.entries as LeaderboardApiEntry[]).map(decorate);
          setTop(buildPodium(entries.slice(0, 3)));
          setRest(entries.slice(3));
          setIsMock(false);
        }
        // Otherwise leave the friendly mock fallback in place
      })
      .catch(() => {
        // Leave mock fallback
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-brand-text">Leaderboard</h2>
        {isMock && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
            Sample
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 items-end gap-1.5">
        {top[0] && <PodiumColumn entry={top[0]} height={64} scoreBg="bg-brand-secondary" />}
        {top[1] && <PodiumColumn entry={top[1]} height={84} scoreBg="bg-brand-secondary" />}
        {top[2] && <PodiumColumn entry={top[2]} height={48} scoreBg="bg-rose-400" />}
      </div>

      <div className="my-3 h-px bg-gray-100" />

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {rest.map((e) => (
          <RankRow key={e.rank} entry={e} />
        ))}
      </div>
    </div>
  );
}
