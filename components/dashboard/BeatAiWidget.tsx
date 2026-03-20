'use client';

import Link from 'next/link';

export function BeatAiWidget() {
  return (
    <Link href="/beat-the-ai" className="group block">
      <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-xl">
            🤖
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold text-brand-text">Beat the AI</h3>
            <p className="text-[11px] text-brand-text-secondary">Challenge AI creativity</p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-brand-text-muted">
          Can your story outsmart the machine? Compete and earn XP.
        </p>

        <div className="mt-auto pt-3">
          <div className="rounded-xl bg-gradient-to-r from-brand-primary to-brand-ai py-2 text-center text-xs font-bold text-white transition-transform group-hover:scale-[1.02]">
            Start Challenge
          </div>
        </div>
      </div>
    </Link>
  );
}
