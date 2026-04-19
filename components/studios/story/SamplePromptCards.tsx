'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { Template } from '@/lib/templates';

interface SamplePromptCardsProps {
  templates: Template[];
  genre: string | undefined;
  onSelect: (template: Template) => void;
}

/** IDs of featured templates shown when no genre is selected (one per genre flavor) */
const FEATURED_IDS = [
  'story-jungle-quest',   // adventure
  'story-magic-library',  // fantasy
  'story-space-cricket',  // sci-fi
  'story-ganesha-coding', // mythology / funny
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function SamplePromptCards({ templates, genre, onSelect }: SamplePromptCardsProps) {
  const cards = useMemo(() => {
    if (genre) {
      return templates.filter((t) => t.settings?.genre === genre);
    }
    // No genre: show featured set first, then remaining templates
    const featured = FEATURED_IDS
      .map((id) => templates.find((t) => t.id === id))
      .filter(Boolean) as Template[];
    const featuredIds = new Set(FEATURED_IDS);
    const rest = templates.filter((t) => !featuredIds.has(t.id));
    return [...featured, ...rest];
  }, [templates, genre]);

  if (cards.length === 0) return null;

  return (
    <motion.div
      key={genre ?? 'featured'}
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
          className="group flex items-start gap-3 rounded-2xl border-2 border-gray-100 bg-white p-4 text-left transition-colors hover:border-brand-purple/30 hover:bg-brand-purple/[0.02]"
        >
          <span className="shrink-0 text-3xl">{template.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-gray-900">{template.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
              {template.description}
            </p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-brand-purple" />
        </motion.button>
      ))}
    </motion.div>
  );
}
