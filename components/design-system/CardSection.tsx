'use client';

import { cn } from '@/lib/utils';

interface DemoCard {
  name: string;
  description: string;
  className: string;
  textColor: string;
  icon: string;
  showProgress?: boolean;
  showBorder?: boolean;
}

const cardVariants: DemoCard[] = [
  {
    name: 'Default Card',
    description: 'Standard white card with subtle shadow and border',
    className: 'bg-brand-surface border border-brand-border shadow-card',
    textColor: 'text-brand-text',
    icon: '📋',
    showProgress: true,
  },
  {
    name: 'Highlighted Card',
    description: 'Gradient background for featured content',
    className: 'gradient-primary text-white shadow-card',
    textColor: 'text-white',
    icon: '⭐',
  },
  {
    name: 'Mission Card',
    description: 'Primary border for active missions',
    className: 'bg-brand-surface border-2 border-brand-primary shadow-card',
    textColor: 'text-brand-text',
    icon: '🎯',
    showProgress: true,
    showBorder: true,
  },
  {
    name: 'Achievement Card',
    description: 'Golden accent for unlocked achievements',
    className: 'bg-brand-surface border-2 border-[#FFD166] shadow-card',
    textColor: 'text-brand-text',
    icon: '🏆',
  },
  {
    name: 'Story Studio',
    description: 'Studio-specific gradient background',
    className: 'gradient-story text-white shadow-card',
    textColor: 'text-white',
    icon: '📖',
  },
  {
    name: 'Music Studio',
    description: 'Studio-specific gradient background',
    className: 'gradient-music text-white shadow-card',
    textColor: 'text-white',
    icon: '🎵',
  },
  {
    name: 'Quiz Studio',
    description: 'Studio-specific gradient background',
    className: 'gradient-quiz text-white shadow-card',
    textColor: 'text-white',
    icon: '🧠',
  },
  {
    name: 'Game Studio',
    description: 'Studio-specific gradient background',
    className: 'gradient-game text-white shadow-card',
    textColor: 'text-white',
    icon: '🎮',
  },
];

export function CardSection() {
  return (
    <section id="cards" className="scroll-mt-28">
      <h2 className="text-h2 font-display text-brand-text mb-2">Cards</h2>
      <p className="text-body-lg text-brand-text-secondary mb-8">
        Cards are the primary UI element. Hover to see lift + shadow transition.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cardVariants.map((card) => (
          <div
            key={card.name}
            className={cn(
              'rounded-xl p-5 transition-all duration-300 cursor-pointer',
              'hover:-translate-y-1 hover:shadow-card-hover',
              card.className
            )}
          >
            <div className="text-3xl mb-3">{card.icon}</div>
            <h3 className={cn('font-display text-h4 mb-1', card.textColor)}>
              {card.name}
            </h3>
            <p className={cn(
              'text-body mb-4',
              card.textColor === 'text-white' ? 'text-white/80' : 'text-brand-text-secondary'
            )}>
              {card.description}
            </p>

            {card.showProgress && (
              <div className="progress-bar mb-3">
                <div className="progress-bar-fill" style={{ width: '65%' }} />
              </div>
            )}

            <button className={cn(
              'text-sm font-semibold rounded-lg px-4 py-2 transition-colors',
              card.textColor === 'text-white'
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-brand-soft text-brand-primary hover:bg-brand-primary hover:text-white'
            )}>
              Start Creating →
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
