'use client';

import { UserPlus } from 'lucide-react';

// Placeholder friends — to be wired to real social data later.
const FRIENDS = [
  { name: 'Priya', emoji: '🐱', bg: 'from-pink-100 to-rose-100', status: 'In Music Lab', online: true, level: 22 },
  { name: 'Rohan', emoji: '🦁', bg: 'from-yellow-100 to-amber-100', status: 'Battle Arena', online: true, level: 31 },
  { name: 'Aisha', emoji: '🐼', bg: 'from-cyan-100 to-sky-100', status: 'Offline · 2h', online: false, level: 18 },
];

export function SquadCard() {
  return (
    <div className="game-hud-frame game-glass flex min-h-0 flex-1 flex-col rounded-lg p-3 shadow-glass">
      <div className="mb-2 shrink-0 font-display text-[11px] font-bold uppercase tracking-wider">
        👥 Squad
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        {FRIENDS.map((f) => (
          <div key={f.name} className="flex items-center gap-2">
            <div className="relative shrink-0">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${f.bg}`}>
                {f.emoji}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white ${
                  f.online ? 'bg-brand-secondary' : 'bg-gray-300'
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-semibold">{f.name}</div>
              <div className="truncate text-[9px] text-brand-text-secondary">{f.status}</div>
            </div>
            <span className="shrink-0 font-mono text-[9px] text-brand-text-secondary">L{f.level}</span>
          </div>
        ))}
      </div>

      <button className="mt-2 flex shrink-0 items-center justify-center gap-1 rounded-lg bg-brand-primary/10 py-1.5 text-[11px] font-bold text-brand-primary transition hover:bg-brand-primary/15">
        <UserPlus className="h-3 w-3" />
        Add Friend
      </button>
    </div>
  );
}
