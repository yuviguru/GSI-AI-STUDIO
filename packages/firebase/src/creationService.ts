/**
 * Re-export shim — preserves the legacy import path while the codebase
 * migrates to importing from `@/lib/repositories/creationRepository` directly.
 *
 * The actual implementation now goes through the backend abstraction layer
 * (`@/lib/backend`) so it works against Firebase, Supabase, or any future
 * adapter without code changes.
 *
 * @deprecated Import from `@/lib/repositories/creationRepository` instead.
 *             This shim will be removed once all callers are migrated.
 */

export {
  saveCreation,
  getCreation,
  incrementView,
  incrementDownload,
  incrementShare,
  incrementRemixCount,
  archiveCreation,
  listCreations,
  listPublicCreations,
  getTopCreators,
} from '@/lib/repositories/creationRepository';

export type {
  SaveCreationInput,
  ListCreationsFilters,
  PublicListFilters,
  ListCreationsResult,
} from '@/lib/repositories/creationRepository';
