'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { Template } from '@/lib/templates';

interface ComicSampleCardsProps {
  templates: Template[];
  style: string | undefined;
  onSelect: (template: Template) => void;
}

/** Featured comic IDs shown first (one per category) */
const FEATURED_IDS = [
  'comic-rooftop-hero',   // Superhero
  'comic-treasure-map',   // Action
  'comic-school-swap',    // Comedy
  'comic-magic-auto',     // Fantasy
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function ComicSampleCards({ templates, style, onSelect }: ComicSampleCardsProps) {
  const cards = useMemo(() => {
    // Filter by style if one is selected
    const filtered = style
      ? templates.filter((t) => t.settings?.style === style)
      : templates;

    // If filtering returns results, use those; otherwise show all
    const pool = filtered.length > 0 ? filtered : templates;

    const featured = FEATURED_IDS
      .map((id) => pool.find((t) => t.id === id))
      .filter(Boolean) as Template[];
    const featuredIds = new Set(featured.map((t) => t.id));
    const rest = pool.filter((t) => !featuredIds.has(t.id));
    return [...featured, ...rest];
  }, [templates, style]);

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
          className="group flex items-start gap-3 rounded-2xl border-2 border-gray-100 bg-white p-4 text-left transition-colors hover:border-orange-300/30 hover:bg-orange-50/[0.02]"
        >
          <span className="shrink-0 text-3xl">{template.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-gray-900">{template.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
              {template.description}
            </p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-orange-500" />
        </motion.button>
      ))}
    </motion.div>
  );
}
