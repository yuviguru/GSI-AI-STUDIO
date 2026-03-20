'use client';

import Link from 'next/link';

const DAILY_MISSIONS = [
  { prompt: 'Write a 5-line poem about the rain', studio: '/create/story', xp: 25 },
  { prompt: 'Create a song about your favourite food', studio: '/create/music', xp: 30 },
  { prompt: 'Make a quiz about space and planets', studio: '/create/quiz', xp: 25 },
  { prompt: 'Write a story where a robot learns to cook', studio: '/create/story', xp: 25 },
  { prompt: 'Create a comic about a superhero cat', studio: '/create/comic', xp: 30 },
  { prompt: 'Build a quiz about Indian history', studio: '/create/quiz', xp: 25 },
  { prompt: 'Write a game where you explore a jungle', studio: '/create/game', xp: 30 },
  { prompt: 'Create a happy song about friendship', studio: '/create/music', xp: 25 },
  { prompt: 'Write a story where animals go to school', studio: '/create/story', xp: 25 },
  { prompt: 'Make a comic about a time-travelling kid', studio: '/create/comic', xp: 30 },
  { prompt: 'Create a science quiz about plants', studio: '/create/quiz', xp: 25 },
  { prompt: 'Write a mystery story set in your city', studio: '/create/story', xp: 30 },
  { prompt: 'Create a lullaby for a baby elephant', studio: '/create/music', xp: 25 },
  { prompt: 'Build a game where you solve riddles', studio: '/create/game', xp: 30 },
  { prompt: 'Make a quiz about the solar system', studio: '/create/quiz', xp: 25 },
  { prompt: 'Write a story about an AI robot friend', studio: '/create/story', xp: 25 },
  { prompt: 'Create a comic about school adventures', studio: '/create/comic', xp: 30 },
  { prompt: 'Compose a rap about learning maths', studio: '/create/music', xp: 30 },
  { prompt: 'Write a story where seasons are characters', studio: '/create/story', xp: 25 },
  { prompt: 'Build a quiz about Indian festivals', studio: '/create/quiz', xp: 25 },
  { prompt: 'Create a game in an underwater city', studio: '/create/game', xp: 30 },
  { prompt: 'Make a comic about a flying school bus', studio: '/create/comic', xp: 30 },
  { prompt: 'Write a poem about the night sky', studio: '/create/story', xp: 25 },
  { prompt: 'Create a quiz about famous inventors', studio: '/create/quiz', xp: 25 },
  { prompt: 'Compose a song about the monsoon', studio: '/create/music', xp: 25 },
  { prompt: 'Write a story about a magical library', studio: '/create/story', xp: 25 },
  { prompt: 'Build a game about a treasure hunt', studio: '/create/game', xp: 30 },
  { prompt: 'Create a comic about future technology', studio: '/create/comic', xp: 30 },
  { prompt: 'Make a quiz about world animals', studio: '/create/quiz', xp: 25 },
  { prompt: 'Write a story about two AI friends', studio: '/create/story', xp: 25 },
];

export function DailyMissionCard() {
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_MISSIONS.length;
  const mission = DAILY_MISSIONS[dayIndex] ?? DAILY_MISSIONS[0]!;

  return (
    <div className="rounded-xl border border-brand-secondary/20 bg-gradient-to-br from-brand-secondary/8 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary/15 text-xl">
          ✨
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-secondary">
            Daily Mission
          </p>
          <p className="mt-1 font-display text-sm font-bold text-gray-900">
            &ldquo;{mission.prompt}&rdquo;
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="rounded-full bg-brand-secondary/15 px-2.5 py-1 text-xs font-bold text-brand-secondary">
              +{mission.xp} XP today
            </span>
            <Link
              href={mission.studio}
              className="rounded-full bg-brand-secondary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              Try it! →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
