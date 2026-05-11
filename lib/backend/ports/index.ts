/**
 * Backend ports — backend-neutral interfaces.
 *
 * Application code imports from here, never from a specific adapter or
 * a backend-vendor SDK directly. Enforced by ESLint.
 */

export type {
  DataStore,
  Transaction,
  QueryOptions,
  QueryFilter,
  QueryOrderBy,
  PaginatedResult,
  FilterOp,
} from './DataStore';

export type { AuthProvider, AuthUser } from './AuthProvider';

export type {
  StorageProvider,
  UploadUrlOptions,
  SignedUploadUrl,
} from './StorageProvider';
