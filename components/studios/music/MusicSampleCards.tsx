'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { Template } from '@/lib/templates';

interface MusicSampleCardsProps {
  templates: Template[];
  mood: string | undefined;
  onSelect: (template: Template) => void;
}

/** Featured template IDs shown when no mood is selected (one per vibe) */
const FEATURED_IDS = [
  'music-sunny-morning',    // happy
  'music-bollywood-beats',  // energetic
  'music-rainy-day',        // chill
  'music-sitar-electronic', // epic
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function MusicSampleCards({ templates, mood, onSelect }: MusicSampleCardsProps) {
  const cards = useMemo(() => {
    if (mood) {
      return templates.filter((t) => t.settings?.mood === mood);
    }
    // No mood: show featured first, then rest
    const featured = FEATURED_IDS
      .map((id) => templates.find((t) => t.id === id))
      .filter(Boolean) as Template[];
    const featuredIds = new Set(FEATURED_IDS);
    const rest = templates.filter((t) => !featuredIds.has(t.id));
    return [...featured, ...rest];
  }, [templates, mood]);

  if (cards.length === 0) return null;

  return (
    <motion.div
      key={mood ?? 'featured'}
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
          className="group flex items-start gap-3 rounded-2xl border-2 border-gray-100 bg-white p-4 text-left transition-colors hover:border-brand-orange/30 hover:bg-brand-orange/[0.02]"
        >
          <span className="shrink-0 text-3xl">{template.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-gray-900">{template.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
              {template.description}
            </p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-brand-orange" />
        </motion.button>
      ))}
    </motion.div>
  );
}
