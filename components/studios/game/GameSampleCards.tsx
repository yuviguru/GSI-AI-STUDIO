'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { Template } from '@/lib/templates';

interface GameSampleCardsProps {
  templates: Template[];
  setting: string | undefined;
  onSelect: (template: Template) => void;
}

/** Featured game IDs shown first (one per setting) */
const FEATURED_IDS = [
  'game-dragon-kingdom',  // Fantasy World
  'game-mars-rescue',     // Space Station
  'game-palace-mystery',  // Indian Palace
  'game-treasure-island', // Mystery Island
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function GameSampleCards({ templates, setting, onSelect }: GameSampleCardsProps) {
  const cards = useMemo(() => {
    // Filter by setting if one is selected
    const filtered = setting
      ? templates.filter((t) => t.settings?.setting === setting)
      : templates;

    // If filtering returns results, use those; otherwise show all
    const pool = filtered.length > 0 ? filtered : templates;

    const featured = FEATURED_IDS
      .map((id) => pool.find((t) => t.id === id))
      .filter(Boolean) as Template[];
    const featuredIds = new Set(featured.map((t) => t.id));
    const rest = pool.filter((t) => !featuredIds.has(t.id));
    return [...featured, ...rest];
  }, [templates, setting]);

  if (cards.length === 0) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-3"
    >
      {cards.map((template) => (
        <motion.button
          key={template.id}
          variants={cardVariants}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(template)}
          className="group flex items-start gap-3 rounded-2xl border-2 border-gray-100 bg-white p-4 text-left transition-colors hover:border-emerald-400/30 hover:bg-emerald-50/[0.02]"
        >
          <span className="shrink-0 text-3xl">{template.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-gray-900">{template.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
              {template.description}
            </p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-emerald-500" />
        </motion.button>
      ))}
    </motion.div>
  );
}
