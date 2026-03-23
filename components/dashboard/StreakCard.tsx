'use client';

import { useEffect, useState } from 'react';

const STREAK_KEY = 'gsi-streak';
const LAST_VISIT_KEY = 'gsi-last-visit';

interface StreakData {
  count: number;
  days: boolean[]; // last 7 days, index 6 = today
}

function loadStreak(): StreakData {
  if (typeof window === 'undefined') return { count: 1, days: [false, false, false, false, false, false, true] };

  const today = new Date().toDateString();
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  const stored = parseInt(localStorage.getItem(STREAK_KEY) ?? '0', 10);

  let count = stored;
  if (!lastVisit) {
    count = 1;
  } else if (lastVisit === today) {
    // Same day — keep existing streak
  } else {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    count = lastVisit === yesterday ? stored + 1 : 1;
  }

  localStorage.setItem(STREAK_KEY, String(count));
  localStorage.setItem(LAST_VISIT_KEY, today);

  // Build 7-day dot array (simplified — today is always true)
  const days = Array(7).fill(false);
  days[6] = true;
  for (let i = 1; i < Math.min(count, 7); i++) {
    days[6 - i] = true;
  }

  return { count, days };
}

export function StreakCard() {
  const [streak, setStreak] = useState<StreakData>({ count: 1, days: [false, false, false, false, false, false, true] });

  useEffect(() => {
    setStreak(loadStreak());
  }, []);

  const message =
    streak.count >= 7 ? '🔥 On fire! Keep it up!' :
    streak.count >= 3 ? 'Nice streak! Keep going!' :
    streak.count === 1 ? 'Day 1! Great start!' :
    `${streak.count} days strong!`;

  return (
    <div className="rounded-xl bg-white p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔥</span>
        <span className="font-mono text-2xl font-bold text-gray-900">{streak.count}</span>
        <span className="text-sm font-semibold text-gray-500">
          {streak.count === 1 ? 'Day Streak' : 'Day Streak'}
        </span>
      </div>

      {/* 7-day dots */}
      <div className="mt-3 flex items-center gap-1.5">
        {streak.days.map((active, i) => (
          <div
            key={i}
            className={`h-2.5 flex-1 rounded-full transition-all ${
              active ? 'bg-orange-400' : 'bg-gray-100'
            } ${i === 6 ? 'ring-1 ring-orange-300 ring-offset-1' : ''}`}
          />
        ))}
      </div>

      <p className="mt-2 text-xs font-medium text-gray-500">{message}</p>
    </div>
  );
}
