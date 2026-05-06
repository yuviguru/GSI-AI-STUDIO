'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type SectionGradient = 'create' | 'play' | 'learn';

interface SectionHeroCardProps {
  title: string;
  subtitle: string;
  count: number;
  href: string;
  gradient: SectionGradient;
  illustration: string;
  illustrationAlt: string;
}

const GRADIENTS: Record<SectionGradient, string> = {
  create: 'from-violet-500 via-purple-500 to-fuchsia-500',
  play: 'from-cyan-400 via-teal-400 to-emerald-400',
  learn: 'from-orange-400 via-pink-400 to-rose-400',
};

export function SectionHeroCard({
  title,
  subtitle,
  count,
  href,
  gradient,
  illustration,
  illustrationAlt,
}: SectionHeroCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl p-5',
        'bg-gradient-to-br shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated',
        GRADIENTS[gradient],
      )}
    >
      <div className="absolute right-2 top-2 rounded-full bg-white/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
        {count} {count === 1 ? 'studio' : 'studios'}
      </div>

      <div className="absolute inset-x-0 top-0 flex h-3/5 items-center justify-center p-3">
        <Image
          src={illustration}
          alt={illustrationAlt}
          width={220}
          height={220}
          priority
          className="h-full w-auto object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="relative z-10">
        <h3 className="font-display text-2xl font-bold text-white">{title}</h3>
        <p className="mt-1 text-sm text-white/85">{subtitle}</p>
      </div>

      <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
    </Link>
  );
}
