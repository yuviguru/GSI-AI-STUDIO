'use client';

import { useId } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StudioTile } from './StudioTile';
import { HERO_IMAGE_SIZES } from '@/lib/responsive/tokens';
import type { SectionDefinition, SectionGradient } from '@/types/dashboard.types';

const GRADIENTS: Record<SectionGradient, string> = {
  create: 'from-violet-500 via-purple-500 to-fuchsia-500',
  play: 'from-cyan-400 via-teal-400 to-emerald-400',
  learn: 'from-orange-400 via-pink-400 to-rose-400',
  review: 'from-blue-500 via-indigo-500 to-violet-500',
  manage: 'from-emerald-500 via-teal-500 to-cyan-500',
  analyze: 'from-amber-500 via-orange-500 to-red-500',
};

interface Props {
  section: SectionDefinition;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ExpandableSectionCard({ section, isExpanded, onToggle }: Props) {
  const reducedMotion = useReducedMotion();
  const reactId = useId();
  const bodyId = `section-body-${reactId}`;
  const studioCount = section.studios.length;

  // If only one studio (or explicit href and zero studios), render as a direct link.
  if (section.href && studioCount === 0) {
    return (
      <Link
        href={section.href}
        className={cn(
          'group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl p-5',
          'bg-gradient-to-br shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated',
          GRADIENTS[section.gradient],
        )}
      >
        <CardHeader section={section} count={studioCount} expandable={false} expanded={false} />
      </Link>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl shadow-card transition-all',
        'bg-gradient-to-br',
        GRADIENTS[section.gradient],
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={bodyId}
        className={cn(
          'relative flex w-full flex-col justify-end overflow-hidden p-5 text-left',
          'transition-transform',
          !isExpanded && 'aspect-[4/5] hover:-translate-y-1',
        )}
      >
        <CardHeader
          section={section}
          count={studioCount}
          expandable
          expanded={isExpanded}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={bodyId}
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeInOut' }
            }
            className="overflow-hidden bg-white/95 backdrop-blur-sm"
          >
            <div className="p-4">
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                }}
              >
                {section.studios.map((studio) => (
                  <StudioTile
                    key={studio.name}
                    name={studio.name}
                    href={studio.href}
                    illustration={studio.illustration}
                    illustrationAlt={studio.illustrationAlt}
                    bg={studio.bg}
                    variant="small"
                    caption={studio.caption}
                    isNew={studio.isNew}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CardHeader({
  section,
  count,
  expandable,
  expanded,
}: {
  section: SectionDefinition;
  count: number;
  expandable: boolean;
  expanded: boolean;
}) {
  return (
    <>
      <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-white/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
        <span>
          {count} {count === 1 ? 'studio' : 'studios'}
        </span>
        {expandable && (
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="absolute inset-x-0 top-0 flex h-3/5 items-center justify-center p-3">
        <Image
          src={section.illustration}
          alt={section.illustrationAlt}
          width={220}
          height={220}
          sizes={HERO_IMAGE_SIZES}
          priority
          className="h-full w-auto object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="relative z-10">
        <h3 className="font-display text-2xl font-bold text-white">{section.title}</h3>
        <p className="mt-1 text-sm text-white/85">{section.subtitle}</p>
      </div>

      <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
    </>
  );
}
