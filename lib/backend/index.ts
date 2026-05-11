/**
 * Backend singleton — env-var-selected adapter.
 *
 * Application code imports `backend` from here. To swap backends:
 *   1. Add a new adapter under `lib/backend/adapters/`.
 *   2. Add a case to `pickBackend()`.
 *   3. Set `BACKEND=<your-adapter>` in `.env`.
 *
 * Nothing else changes. Repositories, capabilities, API routes, and
 * components don't know which backend they're using.
 *
 * Enforced by ESLint: no file outside `lib/backend/adapters/*` may import
 * `firebase-admin/*`, `@supabase/*`, `pg`, etc. directly.
 */

import type { DataStore } from './ports/DataStore';
import type { AuthProvider } from './ports/AuthProvider';
import type { StorageProvider } from './ports/StorageProvider';
import { firebaseAdapter } from './adapters/firebase';

export interface Backend {
  /** Diagnostic name — useful in logs and the /admin/health page. */
  name: string;
  data: DataStore;
  auth: AuthProvider;
  storage: StorageProvider;
}

let _backend: Backend | null = null;

function pickBackend(): Backend {
  const choice = (process.env.BACKEND ?? 'firebase').toLowerCase();
  switch (choice) {
    case 'firebase':
      return firebaseAdapter();
    // When a second adapter ships, add a case here:
    // case 'supabase':
    //   return supabaseAdapter();
    default:
      throw new Error(
        `Unknown BACKEND: "${choice}". Expected one of: firebase` +
          ` (or implement a new adapter under lib/backend/adapters/).`,
      );
  }
}

/**
 * The active backend. Lazy — first access wires up the adapter so module
 * load doesn't crash in environments without env vars (e.g. Next.js build).
 */
export const backend: Backend = new Proxy({} as Backend, {
  get(_, prop) {
    if (!_backend) _backend = pickBackend();
    return Reflect.get(_backend, prop);
  },
});

// Re-export the port types so downstream code only needs one import.
export type {
  DataStore,
  Transaction,
  QueryOptions,
  QueryFilter,
  QueryOrderBy,
  PaginatedResult,
  FilterOp,
} from './ports/DataStore';
export type { AuthProvider, AuthUser } from './ports/AuthProvider';
export type {
  StorageProvider,
  UploadUrlOptions,
  SignedUploadUrl,
} from './ports/StorageProvider';
