'use client';

import { useState } from 'react';
import { useKidProfile } from '@/hooks/useKidProfile';
import { ExpandableSectionCard } from './ExpandableSectionCard';
import { cn } from '@/lib/utils';
import type { SectionDefinition } from '@gsi/types';

const TABS = ['Recent', 'In Progress', 'Today'] as const;
type Tab = (typeof TABS)[number];

interface Props {
  sections: SectionDefinition[];
  /** Greeting context. Falls back to a generic prompt when not provided. */
  greetingName?: string;
  greetingHeadline?: string;
  greetingSubline?: string;
  /** Show the Recent / In Progress / Today tab strip. Kid hub uses true; admin hubs default to false. */
  showTabs?: boolean;
}

export function SectionHub({
  sections,
  greetingName,
  greetingHeadline,
  greetingSubline,
  showTabs = true,
}: Props) {
  const { activeKid } = useKidProfile();
  const [activeTab, setActiveTab] = useState<Tab>('Recent');
  const [expandedId, setExpandedId] = useState<string | null>(
    sections[0]?.id ?? null,
  );

  const name = greetingName ?? activeKid?.name?.split(' ')[0] ?? 'creator';
  const headline =
    greetingHeadline ?? `Hi ${name}! Let's create something today.`;
  const subline =
    greetingSubline ??
    'Pick a section below — your studios, games, and lessons are grouped to keep things tidy.';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-brand-text sm:text-3xl">
          {headline}
        </h1>
        <p className="text-sm text-brand-text-secondary">{subline}</p>
      </div>

      {showTabs && (
        <div className="flex gap-1 border-b border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
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
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <ExpandableSectionCard
            key={section.id}
            section={section}
            isExpanded={expandedId === section.id}
            onToggle={() =>
              setExpandedId((current) => (current === section.id ? null : section.id))
            }
          />
        ))}
      </div>
    </div>
  );
}
