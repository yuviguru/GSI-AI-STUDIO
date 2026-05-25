'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TabBar, type MobileTab } from './TabBar';
import { HubScene } from './HubScene';
import { ProfileScene } from './ProfileScene';
import { RanksScene } from './RanksScene';
import { QuestsScene } from './QuestsScene';

/**
 * Mobile game hub: bottom-tab navigation between 4 full-viewport scenes.
 * No page scroll — each scene fits the screen.
 */
export function MobileHub() {
  const [tab, setTab] = useState<MobileTab>('hub');

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* Status-bar spacer for iOS notch */}
      <div className="shrink-0 h-[env(safe-area-inset-top,0px)]" />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex flex-col"
          >
            {tab === 'hub' && <HubScene onTabChange={setTab} />}
            {tab === 'profile' && <ProfileScene />}
            {tab === 'ranks' && <RanksScene />}
            {tab === 'quests' && <QuestsScene />}
          </motion.div>
        </AnimatePresence>
      </div>

      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
