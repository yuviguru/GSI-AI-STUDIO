'use client';

import Link from 'next/link';

export function ShowAllAppsWidget() {
  return (
    <Link href="/create/story" className="group block">
      <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xl">
            🚀
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold text-brand-text">Show All Apps</h3>
            <p className="text-[11px] text-brand-text-secondary">Browse all AI studios</p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-brand-text-muted">
          Explore every creative studio — stories, music, comics, games and more.
        </p>

        <div className="mt-auto pt-3">
          <div className="rounded-xl bg-gradient-to-r from-brand-primary to-violet-500 py-2 text-center text-xs font-bold text-white transition-transform group-hover:scale-[1.02]">
            Explore All
          </div>
        </div>
      </div>
    </Link>
  );
}
