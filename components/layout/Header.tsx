'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full',
        'border-b border-gray-100 bg-white/80 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🎨</span>
          <span className="font-display text-lg font-bold text-gray-900">
            GSI AI Studio
          </span>
        </Link>

        <div className="flex items-center gap-1.5 rounded-full bg-brand-purple/10 px-3 py-1.5 text-sm font-medium text-brand-purple">
          <Sparkles className="h-4 w-4" />
          <span>0 AI Points</span>
        </div>
      </div>
    </header>
  );
}
