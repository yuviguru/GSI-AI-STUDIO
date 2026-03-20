'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const LEVELS = [
  { label: 'Explorer', emoji: '🌱' },
  { label: 'Creator',  emoji: '🚀' },
  { label: 'Master',   emoji: '⭐' },
];

interface MissionItem {
  emoji: string;
  name: string;
  meta: string;
  href: string;
  bg: string;
}

interface WeekSection {
  label: string;
  count: string;
  items: MissionItem[];
}

const WEEK_SECTIONS: WeekSection[] = [
  {
    label: 'Today',
    count: '3 Missions',
    items: [
      { emoji: '📖', name: 'Story Studio',   meta: '30 min',  href: '/create/story',   bg: 'bg-violet-100' },
      { emoji: '🎵', name: 'Music Lab',      meta: '20 min',  href: '/create/music',   bg: 'bg-orange-100' },
      { emoji: '🤖', name: 'Beat the AI',    meta: '+30 XP',  href: '/beat-the-ai',    bg: 'bg-purple-100' },
    ],
  },
  {
    label: 'This Week',
    count: '5 Challenges',
    items: [
      { emoji: '🎮', name: 'Quiz Maker',     meta: '25 min',  href: '/create/quiz',    bg: 'bg-cyan-100'     },
      { emoji: '🕹️', name: 'Game Studio',   meta: '20 min',  href: '/create/game',    bg: 'bg-emerald-100'  },
      { emoji: '🎨', name: 'Comic Studio',   meta: '15 min',  href: '/create/comic',   bg: 'bg-amber-100'    },
    ],
  },
];

const SCHEDULE_ITEMS = [
  { emoji: '🤖', label: 'Beat the AI Challenge', time: '4:00 PM', href: '/beat-the-ai' },
  { emoji: '✨', label: 'Daily Creative Mission',  time: 'Anytime', href: '/create/story' },
];

// ─── Mission item card ─────────────────────────────────────────────────────────

function MissionCard({ item }: { item: MissionItem }) {
  return (
    <Link href={item.href} className="group block shrink-0">
      <div className="flex w-[88px] flex-col items-center gap-1.5 rounded-xl bg-white p-3 shadow-card transition-shadow hover:shadow-card-hover">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${item.bg}`}>
          {item.emoji}
        </div>
        <p className="text-center text-[11px] font-bold leading-tight text-gray-800">{item.name}</p>
        <p className="text-[10px] text-gray-400">{item.meta}</p>
      </div>
    </Link>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────────

export function CreativeJourneySection() {
  const [activeLevel, setActiveLevel] = useState(1);

  return (
    <div className="flex flex-col gap-5">

      {/* Heading + AI badge */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-extrabold text-gray-900">
          Your creative journey
        </h2>
        <span className="rounded-lg bg-brand-secondary px-2.5 py-0.5 text-xs font-bold text-white">
          Powered by AI
        </span>
      </div>

      {/* Level tabs */}
      <div className="flex items-center gap-2">
        {LEVELS.map((l, i) => (
          <button
            key={l.label}
            onClick={() => setActiveLevel(i)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
              activeLevel === i
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 shadow-card hover:bg-gray-50'
            }`}
          >
            <span>{l.emoji}</span>
            {l.label}
          </button>
        ))}
      </div>

      {/* Week sections */}
      {WEEK_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
              {section.label}
            </span>
            <span className="text-xs text-gray-400">🔥 {section.count}</span>
          </div>

          <div className="mt-2.5 flex items-start gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {section.items.map((item) => (
              <MissionCard key={item.name} item={item} />
            ))}

            {/* Add slot */}
            <Link href="/create/story" className="block shrink-0">
              <div className="flex h-[116px] w-[88px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 transition-colors hover:border-brand-purple/40 hover:bg-brand-purple/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <Plus className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-[11px] font-bold text-gray-400">Add</p>
              </div>
            </Link>
          </div>
        </div>
      ))}

      {/* Schedule */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-gray-900">Schedule</h3>
          <div className="flex items-center gap-2">
            <button className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple hover:bg-brand-purple/20">
              <Plus className="h-4 w-4" />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base text-gray-400 shadow-card hover:text-gray-600">
              ≡
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-2">
          {SCHEDULE_ITEMS.map((item) => (
            <Link key={item.label} href={item.href} className="block">
              <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-card transition-shadow hover:shadow-card-hover">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-base">
                  {item.emoji}
                </div>
                <p className="flex-1 text-sm font-semibold text-gray-700">{item.label}</p>
                <p className="font-mono text-xs font-bold text-gray-400">{item.time}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
