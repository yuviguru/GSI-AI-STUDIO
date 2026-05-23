'use client';

import { useEffect, useRef } from 'react';
import { DesktopHub } from './desktop/DesktopHub';
import { MobileHub } from './mobile/MobileHub';
import { GameHubBackground } from './shared/Background';
import { playSound } from '@/lib/sounds';

/**
 * GameHub: the home-page lobby experience.
 *
 * Desktop (lg+): 3-column gaming UI fitting one viewport.
 * Mobile (<lg): bottom-tab navigation between 4 full-screen scenes.
 *
 * Both render simultaneously and toggle via Tailwind responsive classes;
 * this avoids hydration mismatches from JS-based viewport detection.
 */
export function GameHub() {
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (soundPlayed.current) return;
    soundPlayed.current = true;
    // hubOpen sound — short ascending chord on lobby entry
    playSound('hubOpen');
  }, []);

  return (
    <div className="game-hub-bg relative min-h-[100dvh]">
      <GameHubBackground />

      {/* Desktop hub (lg and up) */}
      <div className="hidden h-screen lg:block">
        <DesktopHub />
      </div>

      {/* Mobile hub (below lg) */}
      <div className="block h-[100dvh] lg:hidden">
        <MobileHub />
      </div>
    </div>
  );
}
