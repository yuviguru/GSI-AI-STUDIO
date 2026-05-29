'use client';

import { TopHud } from './TopHud';
import { PlayerCard } from './PlayerCard';
import { BadgesCard } from './BadgesCard';
import { SquadCard } from './SquadCard';
import { HeroStage } from './HeroStage';
import { ModeGrid } from './ModeGrid';
import { LeaderboardCard } from './LeaderboardCard';
import { QuestsCard } from './QuestsCard';

/**
 * Desktop game hub: full-viewport 3-column gaming UI.
 * Fits a 1080p screen without scrolling. Falls back gracefully on smaller laptops.
 *
 * COMMUNITY-001 surfaces (online + streak) live inside <TopHud /> rather than
 * as separate elements — they reuse the existing center pills.
 */
export function DesktopHub() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopHud />

      <main className="mx-auto grid min-h-0 w-full max-w-[1520px] flex-1 gap-5 overflow-hidden px-6 py-5 lg:grid-cols-[280px_1fr_300px] xl:gap-6 xl:px-8">
        {/* LEFT */}
        <aside className="flex min-h-0 flex-col gap-4">
          <PlayerCard />
          <BadgesCard />
          <SquadCard />
        </aside>

        {/* CENTER */}
        <section className="flex min-h-0 flex-col gap-4">
          <HeroStage resumeLabel="Dragon Story" resumeHref="/create/story" />
          <ModeGrid />
        </section>

        {/* RIGHT */}
        <aside className="flex min-h-0 flex-col gap-4">
          <LeaderboardCard />
          <QuestsCard />
        </aside>
      </main>
    </div>
  );
}
