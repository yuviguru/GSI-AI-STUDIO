'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface OnboardingSlideProps {
  illustration: ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
}

export function OnboardingSlide({
  illustration,
  title,
  subtitle,
  gradient,
}: OnboardingSlideProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center px-6',
        gradient,
      )}
    >
      {/* Illustration area — top portion */}
      <div className="flex flex-1 items-center justify-center pb-4 pt-16">
        {illustration}
      </div>

      {/* Text area — bottom portion */}
      <div className="flex flex-col items-center gap-3 pb-32 text-center">
        <h2 className="font-display text-2xl font-bold text-gray-900">
          {title}
        </h2>
        <p className="max-w-xs text-base leading-relaxed text-gray-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
