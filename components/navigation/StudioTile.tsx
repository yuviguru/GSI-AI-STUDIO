'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type StudioTileVariant = 'large' | 'square' | 'wide' | 'small';

interface StudioTileProps {
  name: string;
  href: string;
  illustration: string;
  illustrationAlt: string;
  bg: string;
  variant: StudioTileVariant;
  caption?: string;
  isNew?: boolean;
}

const VARIANTS: Record<StudioTileVariant, string> = {
  large: 'col-span-2 row-span-2 aspect-square',
  square: 'aspect-square',
  wide: 'col-span-2 aspect-[2/1]',
  small: 'aspect-square',
};

export function StudioTile({
  name,
  href,
  illustration,
  illustrationAlt,
  bg,
  variant,
  caption,
  isNew,
}: StudioTileProps) {
  const isLarge = variant === 'large';
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col justify-end overflow-hidden rounded-2xl p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated',
        VARIANTS[variant],
        bg,
      )}
    >
      {isNew && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
          New
        </span>
      )}

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Image
          src={illustration}
          alt={illustrationAlt}
          width={isLarge ? 200 : 110}
          height={isLarge ? 200 : 110}
          loading="lazy"
          className={cn(
            'object-contain transition-transform duration-300 group-hover:scale-105',
            isLarge ? 'h-3/4 w-auto' : 'h-2/3 w-auto',
          )}
        />
      </div>

      <div className="relative z-10">
        <h4
          className={cn(
            'font-display font-bold text-brand-text drop-shadow-sm',
            isLarge ? 'text-xl' : 'text-sm',
          )}
        >
          {name}
        </h4>
        {caption && (
          <p
            className={cn(
              'text-brand-text-secondary',
              isLarge ? 'mt-0.5 text-xs' : 'text-[10px]',
            )}
          >
            {caption}
          </p>
        )}
      </div>
    </Link>
  );
}
