'use client';

import { useState } from 'react';
import { useKidProfile } from '@/hooks/useKidProfile';
import { useAiPoints } from '@/contexts/AiPointsContext';
import { SectionHeroCard } from './SectionHeroCard';
import { StudioTile, type StudioTileVariant } from './StudioTile';
import { cn } from '@/lib/utils';

const HERO_SECTIONS = [
  {
    title: 'Create',
    subtitle: 'Tell stories, write books, make music & more',
    count: 6,
    href: '/create/story',
    gradient: 'create' as const,
    illustration: '/illustrations/sections/create.svg',
    illustrationAlt: 'Kid painting on a glowing tablet',
  },
  {
    title: 'Play',
    subtitle: 'Beat the AI or run your own kid business',
    count: 2,
    href: '/beat-the-ai',
    gradient: 'play' as const,
    illustration: '/illustrations/sections/play.svg',
    illustrationAlt: 'Kid versus a friendly AI robot at a console',
  },
  {
    title: 'Learn',
    subtitle: 'Skill arena, AI Lab, and homework',
    count: 3,
    href: '/skill-arena',
    gradient: 'learn' as const,
    illustration: '/illustrations/sections/learn.svg',
    illustrationAlt: 'Kid with a glowing book and an AI brain mascot',
  },
];

const STUDIOS: Array<{
  name: string;
  href: string;
  illustration: string;
  illustrationAlt: string;
  bg: string;
  variant: StudioTileVariant;
  caption: string;
  isNew?: boolean;
  creationKey?: string;
}> = [
  {
    name: 'Story',
    href: '/create/story',
    illustration: '/illustrations/studios/story.svg',
    illustrationAlt: 'Open storybook with characters jumping out',
    bg: 'bg-gradient-to-br from-violet-100 to-purple-200',
    variant: 'large',
    caption: 'AI-illustrated short stories',
    creationKey: 'story',
  },
  {
    name: 'Book',
    href: '/create/book',
    illustration: '/illustrations/studios/books.svg',
    illustrationAlt: 'Stack of glowing books',
    bg: 'bg-gradient-to-br from-indigo-100 to-blue-200',
    variant: 'wide',
    caption: 'Write your own book, page by page',
    isNew: true,
    creationKey: 'book',
  },
  {
    name: 'Music',
    href: '/create/music',
    illustration: '/illustrations/studios/music.svg',
    illustrationAlt: 'Headphones with floating music notes',
    bg: 'bg-gradient-to-br from-orange-100 to-amber-200',
    variant: 'square',
    caption: 'Compose tracks',
    creationKey: 'music',
  },
  {
    name: 'Comic',
    href: '/create/comic',
    illustration: '/illustrations/studios/comic.svg',
    illustrationAlt: 'Comic panels with speech bubbles',
    bg: 'bg-gradient-to-br from-amber-100 to-yellow-200',
    variant: 'square',
    caption: 'Multi-panel art',
    creationKey: 'comic',
  },
  {
    name: 'Game',
    href: '/create/game',
    illustration: '/illustrations/studios/game.svg',
    illustrationAlt: 'Joystick and a pixel-art creature',
    bg: 'bg-gradient-to-br from-cyan-100 to-teal-200',
    variant: 'square',
    caption: 'Choose-your-adventure',
    creationKey: 'game',
  },
  {
    name: 'Quiz',
    href: '/create/quiz',
    illustration: '/illustrations/studios/quiz.svg',
    illustrationAlt: 'Game-show buzzer with question marks',
    bg: 'bg-gradient-to-br from-emerald-100 to-green-200',
    variant: 'square',
    caption: 'Build a quiz game',
    creationKey: 'quiz',
  },
];

const TABS = ['Recent', 'In Progress', 'Today'] as const;
type Tab = (typeof TABS)[number];

export function SectionHub() {
  const { activeKid } = useKidProfile();
  const { creationsByType } = useAiPoints();
  const [activeTab, setActiveTab] = useState<Tab>('Recent');
  const greetingName = activeKid?.name?.split(' ')[0] ?? 'creator';

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting strip */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-text sm:text-3xl">
          Hi {greetingName}! Let&apos;s create something today.
        </h1>
        <p className="text-sm text-brand-text-secondary">
          Pick a section below — your studios, games, and lessons are grouped to keep things tidy.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'relative px-4 py-2 text-sm font-semibold transition-colors',
              activeTab === tab
                ? 'text-brand-primary'
                : 'text-brand-text-secondary hover:text-brand-text',
            )}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-primary" />
            )}
          </button>
        ))}
      </div>

      {/* 3 hero section cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {HERO_SECTIONS.map((section) => (
          <SectionHeroCard key={section.title} {...section} />
        ))}
      </div>

      {/* Top Studios mosaic */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold text-brand-text">Top Studios</h2>
          <span className="text-xs text-brand-text-secondary">All 6 studios</span>
        </div>

        <div className="grid grid-cols-4 grid-rows-2 gap-3">
          {STUDIOS.map((studio) => {
            const count = studio.creationKey ? creationsByType?.[studio.creationKey] ?? 0 : 0;
            const caption = count > 0 ? `${count} created` : studio.caption;
            return (
              <StudioTile
                key={studio.name}
                name={studio.name}
                href={studio.href}
                illustration={studio.illustration}
                illustrationAlt={studio.illustrationAlt}
                bg={studio.bg}
                variant={studio.variant}
                caption={caption}
                isNew={studio.isNew}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
