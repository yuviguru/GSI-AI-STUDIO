'use client';

import { usePathname } from 'next/navigation';
import { BackLink } from './BackLink';

/**
 * Human-readable labels for known section paths. When a page's parent
 * path matches one of these keys, the BackLink shows this label.
 *
 * To add a new section, just add an entry here — no per-page work needed.
 */
const SECTION_LABELS: Record<string, string> = {
  '/ceo': 'Kid CEO',
  '/ceo/play': 'Kid CEO Game',
  '/learn': 'AI Lab',
  '/beat-the-ai': 'Challenges',
  '/create/book': 'My Books',
  '/create/story': 'Story Studio',
  '/create/music': 'Music Lab',
  '/create/quiz': 'Quiz Maker',
  '/create/comic': 'Comic Studio',
  '/create/game': 'Game Studio',
  '/homework/history': 'Homework History',
  '/creations': 'My Creations',
  '/explore': 'Explore',
  '/skill-arena': 'Skill Arena',
  '/settings': 'Settings',
};

/**
 * Paths that are purely structural groupings (no real page). When a
 * parent resolves to one of these, we skip it and walk further up.
 */
const SKIP_PATHS = new Set(['/create', '/homework', '/ceo/profile']);

/**
 * Walk up the pathname until we find a known section (or `/`).
 * Returns the back-link target `{ href, label }`, or `null` if the
 * current page shouldn't show a back link at all.
 */
function resolveBackTarget(pathname: string): { href: string; label: string } | null {
  // No back link on the Game Hub
  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i--) {
    const candidate = i === 0 ? '/' : '/' + segments.slice(0, i).join('/');

    // Skip structural groupings that have no landing page
    if (SKIP_PATHS.has(candidate)) continue;

    const label = SECTION_LABELS[candidate];
    if (label) {
      return { href: candidate, label };
    }

    // Reached root
    if (candidate === '/') {
      return { href: '/', label: 'Back to home' };
    }
  }

  // Fallback: go home
  return { href: '/', label: 'Back to home' };
}

/**
 * Layout-level BackLink that auto-renders on every inner page.
 *
 * Reads `usePathname()` and walks up the URL tree to find the nearest
 * known parent section. Pages at `/` (the Game Hub) get no back link.
 *
 * Renders left-aligned directly under the GameNavBar with no extra
 * background — it inherits the page's own gradient / white backdrop.
 *
 * Drop this in the layout once — new pages get a back link automatically.
 */
export function LayoutBackLink() {
  const pathname = usePathname();
  const target = resolveBackTarget(pathname);

  if (!target) return null;

  return (
    <BackLink href={target.href} label={target.label} className="mb-0 px-4 pt-2 sm:px-6" />
  );
}
