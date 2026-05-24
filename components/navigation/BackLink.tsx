'use client';

import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackLinkProps {
  /** Navigation target. Defaults to `/` (Game Hub). */
  href?: string;
  /** Link label. Defaults to "Back to home". */
  label?: string;
  /** Additional CSS classes on the wrapper. */
  className?: string;
}

/**
 * Reusable "← Back" link for inner pages.
 * Sits below the nav bar, inside the page content area.
 *
 * When `href` points somewhere other than `/` (i.e. the page is nested
 * deeper than one level), a secondary "Main Menu" link to `/` is shown
 * automatically so kids can always jump straight back to the Game Hub.
 *
 * @example
 *   <BackLink />                                          // ← Back to home
 *   <BackLink label="Back to challenges" href="/beat-the-ai" />  // ← Back to challenges · 🏠 Main Menu
 *   <BackLink label="Back to library" href="/create/book" />     // ← Back to library · 🏠 Main Menu
 */
export function BackLink({
  href = '/',
  label = 'Back to home',
  className,
}: BackLinkProps) {
  const isDeep = href !== '/';

  const linkClass =
    'inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-brand-primary';

  return (
    <div className={cn('mb-3 flex items-center gap-4', className)}>
      <Link href={href} className={linkClass}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>

      {isDeep && (
        <Link href="/" className={linkClass}>
          <Home className="h-4 w-4" />
          Main Menu
        </Link>
      )}
    </div>
  );
}
