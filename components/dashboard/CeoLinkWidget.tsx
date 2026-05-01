'use client';

import Link from 'next/link';
import { Briefcase, ChevronRight } from 'lucide-react';

export function CeoLinkWidget() {
  return (
    <Link href="/ceo" className="group block">
      <div className="flex h-full items-center gap-3 rounded-xl bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Briefcase className="h-5 w-5 text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-bold text-brand-text">
            Be the CEO
          </h3>
          <p className="truncate text-[11px] text-brand-text-muted">
            Run your own AI startup
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-brand-text-muted transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
