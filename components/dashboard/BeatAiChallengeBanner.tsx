'use client';

import Link from 'next/link';

export function BeatAiChallengeBanner() {
  return (
    <Link href="/beat-the-ai" className="group block">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-5">
        {/* Background decoration */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-4 right-16 h-20 w-20 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 text-3xl backdrop-blur-sm">
            🤖
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-200">
              Daily Challenge
            </p>
            <h3 className="mt-0.5 font-display text-lg font-extrabold text-white">
              Beat the AI
            </h3>
            <p className="mt-0.5 text-sm text-purple-100">
              Can your creativity outsmart artificial intelligence?
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-purple-700 shadow-lg transition-transform group-hover:scale-105">
            Play Now →
          </span>
        </div>
      </div>
    </Link>
  );
}
