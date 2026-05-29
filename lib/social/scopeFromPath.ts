/**
 * Pathname → CommunityScope mapper (COMMUNITY-001 navbar wiring).
 *
 * Used by TopHud + GameNavBar to decide whether to show global counts
 * or studio-specific counts. Keep this dumb: a flat switch on path
 * prefixes. Anything we don't recognise falls back to 'global'.
 */

import { STUDIO_IDS, type StudioId } from '@gsi/types';
import type { CommunityScope } from './onlineCounter';

const STUDIO_SET = new Set<string>(STUDIO_IDS);

/** Short, human-readable label for a scope (used in pill text).
 *  Kept terse so it fits in the navbar pill alongside the number. */
export function scopeLabel(scope: CommunityScope): string {
  switch (scope) {
    case 'global': return '';
    case 'book':   return 'Books';
    case 'story':  return 'Stories';
    case 'music':  return 'Music';
    case 'quiz':   return 'Quiz';
    case 'comic':  return 'Comics';
    case 'game':   return 'Games';
    default:       return '';
  }
}

/** Map a Next.js pathname to a community scope.
 *
 *   /                     → global
 *   /create/book          → book
 *   /create/book/abc123   → book (editor still book-scoped)
 *   /shop/books           → book (bookshop is the book community surface)
 *   /view/book/<slug>     → book (public viewer)
 *   /create/<studio>/...  → <studio>
 *   anything else         → global
 *
 * The pathname is normalized to handle trailing slashes and query stripping
 * is left to the caller (Next's `usePathname` already strips queries).
 */
export function scopeFromPath(pathname: string | null | undefined): CommunityScope {
  if (!pathname) return 'global';
  const path = pathname.replace(/\/+$/, ''); // strip trailing slash
  const parts = path.split('/').filter(Boolean);

  // /create/<studio>[/...]
  if (parts[0] === 'create' && parts[1] && STUDIO_SET.has(parts[1])) {
    return parts[1] as StudioId;
  }

  // /shop/books → book scope
  if (parts[0] === 'shop' && parts[1] === 'books') {
    return 'book';
  }

  // /view/book/* → book scope
  if (parts[0] === 'view' && parts[1] === 'book') {
    return 'book';
  }

  return 'global';
}
