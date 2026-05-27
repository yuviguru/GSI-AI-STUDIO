/**
 * Studio launch-state resolver (LAUNCH-001) — server side.
 *
 * Resolution order:
 *   1. In-code defaults (this file's DEFAULTS map)
 *   2. Firestore `config/studios` doc — overrides per-studio launchState/label
 *
 * Errors during the Firestore read are swallowed and logged; the resolver
 * returns defaults so a Firestore outage never breaks the hub render. The
 * /api/config/studios endpoint relies on this — see `apps/kid/app/api/config/studios/route.ts`.
 *
 * To keep client/server in sync, edit BOTH this file's DEFAULTS and the
 * mirror in `studioLaunchStateDefaults.ts`. The duplication is deliberate
 * (client must paint without a server fetch).
 */

import { adminDb } from '@gsi/firebase';
import {
  asStudioLaunchState,
  STUDIO_IDS,
  type StudioConfig,
  type StudioId,
  type StudioLaunchConfig,
} from '@gsi/types';

const CONFIG_COLLECTION = 'config';
const STUDIOS_DOC = 'studios';

const DEFAULTS: Readonly<Record<StudioId, StudioConfig>> = {
  book: { launchState: 'live', label: 'Book Studio' },
  story: { launchState: 'beta', label: 'Story Studio' },
  music: { launchState: 'beta', label: 'Music Lab' },
  quiz: { launchState: 'beta', label: 'Quiz Maker' },
  comic: { launchState: 'beta', label: 'Comic Studio' },
  game: { launchState: 'beta', label: 'Game Studio' },
};

/**
 * Merge an arbitrary Firestore studios map onto the defaults. Unknown studio
 * ids in the override are ignored — the type narrows to a known StudioId
 * before write. Missing fields fall through to defaults.
 *
 * Exported for unit tests.
 */
export function mergeStudioOverrides(
  override: Record<string, unknown> | null | undefined,
): Record<StudioId, StudioConfig> {
  const result: Record<StudioId, StudioConfig> = { ...DEFAULTS };
  if (!override || typeof override !== 'object') return result;

  for (const id of STUDIO_IDS) {
    const raw = (override as Record<string, unknown>)[id];
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    result[id] = {
      launchState: asStudioLaunchState(entry.launchState),
      label: typeof entry.label === 'string' ? entry.label : DEFAULTS[id].label,
    };
  }
  return result;
}

/**
 * Resolve the full studio launch-state config (defaults merged with the
 * Firestore override, if any). Always returns a usable map — never throws.
 */
export async function getStudioLaunchStates(): Promise<StudioLaunchConfig> {
  let override: Record<string, unknown> | null = null;
  try {
    const snap = await adminDb.collection(CONFIG_COLLECTION).doc(STUDIOS_DOC).get();
    if (snap.exists) {
      const data = snap.data();
      if (data && typeof data.studios === 'object' && data.studios !== null) {
        override = data.studios as Record<string, unknown>;
      }
    }
  } catch (err) {
    console.warn('[studioLaunchState] Firestore read failed, using defaults:', err);
  }
  return { studios: mergeStudioOverrides(override) };
}
