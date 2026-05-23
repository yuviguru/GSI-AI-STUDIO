'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ModeTile } from '../shared/ModeTile';
import { ModeGroupTabs } from '../shared/ModeGroupTabs';
import { getModesByGroup, type ModeGroup } from '../shared/GameModes';
import { bentoContainer, bentoShape, bentoSpan } from '../shared/bento';

export function ModeGrid() {
  const [group, setGroup] = useState<ModeGroup>('create');
  const modes = getModesByGroup(group);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tabs centered as the focal element; mode-count pinned to the right
          so it doesn't push the tabs off-axis. The relative wrapper lets us
          absolutely position the count without disrupting tab centering. */}
      <div className="relative mb-3 flex shrink-0 items-center justify-center">
        <ModeGroupTabs active={group} onChange={setGroup} variant="desktop" />
        <span className="absolute right-0 font-mono text-[10px] uppercase tracking-widest text-brand-text-secondary">
          {modes.length} {modes.length === 1 ? 'mode' : 'modes'}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={group}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className={`grid min-h-0 flex-1 gap-4 ${bentoContainer(group, 'desktop')}`}
        >
          {modes.map((mode, i) => (
            <ModeTile
              key={mode.key}
              mode={mode}
              variant="desktop"
              shape={bentoShape(group, i, 'desktop')}
              className={bentoSpan(group, i, 'desktop')}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
