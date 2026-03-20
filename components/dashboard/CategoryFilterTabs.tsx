'use client';

import { useState } from 'react';
import Link from 'next/link';

const TABS = [
  { label: 'Stories',  href: '/create/story',  emoji: '📖', activeBg: 'bg-violet-500',  inactiveBg: 'bg-violet-100',  inactiveText: 'text-violet-700' },
  { label: 'Music',    href: '/create/music',  emoji: '🎵', activeBg: 'bg-orange-500',  inactiveBg: 'bg-orange-100',  inactiveText: 'text-orange-700' },
  { label: 'Games',    href: '/create/quiz',   emoji: '🎮', activeBg: 'bg-cyan-500',    inactiveBg: 'bg-cyan-100',    inactiveText: 'text-cyan-700'   },
  { label: 'Comics',   href: '/create/comic',  emoji: '🎨', activeBg: 'bg-amber-500',   inactiveBg: 'bg-amber-100',   inactiveText: 'text-amber-700'  },
  { label: 'List',     href: '/creations',     emoji: '📋', activeBg: 'bg-gray-700',    inactiveBg: 'bg-gray-100',    inactiveText: 'text-gray-600'   },
];

export function CategoryFilterTabs() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab, i) => {
        const isActive = active === i;
        return (
          <Link key={tab.href} href={tab.href}>
            <button
              onClick={() => setActive(i)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isActive ? `${tab.activeBg} text-white shadow-sm` : `${tab.inactiveBg} ${tab.inactiveText}`
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          </Link>
        );
      })}
    </div>
  );
}
