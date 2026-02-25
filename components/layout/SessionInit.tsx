'use client';

import { useSession } from '@/hooks/useSession';

/**
 * Isolates session initialization into its own component so that
 * useSession state updates (e.g. cooldown timer ticks) don't cause
 * the entire PublicLayout tree to re-render.
 */
export function SessionInit() {
  useSession();
  return null;
}
