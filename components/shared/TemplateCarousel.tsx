'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Template } from '@/lib/templates';

interface TemplateCarouselProps {
  templates: Template[];
  categories: string[];
  dailySpark: Template | null;
  accentColor: 'brand-purple' | 'brand-orange' | 'brand-cyan';
  onSelect: (template: Template) => void;
  className?: string;
}

export function TemplateCarousel({
  templates,
  categories,
  dailySpark,
  accentColor,
  onSelect,
  className,
}: TemplateCarouselProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredTemplates = activeCategory
    ? templates.filter((t) => t.category === activeCategory)
    : templates;

  // Build display list: daily spark first (if no category filter), then templates
  const displayTemplates = activeCategory
    ? filteredTemplates
    : dailySpark
      ? [dailySpark, ...filteredTemplates]
      : filteredTemplates;

  const colorMap = {
    'brand-purple': {
      activeBg: 'bg-brand-purple text-white',
      inactiveBg: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      cardBorder: 'border-brand-purple/20 hover:border-brand-purple/50',
      sparkBg: 'bg-gradient-to-br from-brand-purple/10 to-brand-purple/5 border-brand-purple/30',
      sparkBadge: 'bg-brand-purple text-white',
      seeAll: 'text-brand-purple',
    },
    'brand-orange': {
      activeBg: 'bg-brand-orange text-white',
      inactiveBg: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      cardBorder: 'border-brand-orange/20 hover:border-brand-orange/50',
      sparkBg: 'bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 border-brand-orange/30',
      sparkBadge: 'bg-brand-orange text-white',
      seeAll: 'text-brand-orange',
    },
    'brand-cyan': {
      activeBg: 'bg-brand-cyan text-white',
      inactiveBg: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      cardBorder: 'border-brand-cyan/20 hover:border-brand-cyan/50',
      sparkBg: 'bg-gradient-to-br from-brand-cyan/10 to-brand-cyan/5 border-brand-cyan/30',
      sparkBadge: 'bg-brand-cyan text-white',
      seeAll: 'text-brand-cyan',
    },
  };

  const colors = colorMap[accentColor];

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Templates</h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className={cn('text-xs font-medium', colors.seeAll)}
        >
          {showAll ? 'Show less' : 'See all'}
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95',
            activeCategory === null ? colors.activeBg : colors.inactiveBg
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95',
              activeCategory === cat ? colors.activeBg : colors.inactiveBg
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards */}
      {showAll ? (
        /* Grid view */
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {displayTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isDailySpark={template.id === dailySpark?.id}
              colors={colors}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        /* Horizontal scroll */
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {displayTemplates.map((template) => (
            <div key={template.id} className="shrink-0" style={{ scrollSnapAlign: 'start' }}>
              <TemplateCard
                template={template}
                isDailySpark={template.id === dailySpark?.id}
                colors={colors}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  isDailySpark: boolean;
  colors: {
    cardBorder: string;
    sparkBg: string;
    sparkBadge: string;
  };
  onSelect: (template: Template) => void;
}

function TemplateCard({ template, isDailySpark, colors, onSelect }: TemplateCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => onSelect(template)}
      className={cn(
        'flex w-[140px] flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition-all',
        isDailySpark ? colors.sparkBg : cn('border-gray-200 bg-white', colors.cardBorder)
      )}
    >
      {isDailySpark && (
        <span className={cn('mb-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold', colors.sparkBadge)}>
          Daily Spark
        </span>
      )}
      <span className="text-2xl">{template.emoji}</span>
      <span className="line-clamp-1 text-sm font-semibold text-gray-800">{template.title}</span>
      <span className="line-clamp-2 text-xs text-gray-500">{template.description}</span>
    </motion.button>
  );
}
