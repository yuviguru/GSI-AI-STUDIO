/**
 * DataStore port — backend-neutral CRUD + query interface.
 *
 * No file outside `lib/backend/adapters/*` may import a database driver
 * directly. Application code talks to this interface; an adapter implements
 * it for Firestore, Postgres (Supabase), or anything else.
 *
 * Cursors are opaque base64-encoded JSON strings — repositories never inspect
 * them. Each adapter encodes its own pagination state inside.
 *
 * Timestamps in the domain layer are ISO-8601 strings. Adapters convert to
 * native types (Firestore Timestamp, Postgres timestamptz) at the boundary.
 */

export type FilterOp =
  | 'eq'
  | 'ne'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'in'
  | 'not-in'
  | 'array-contains'
  | 'array-contains-any';

export interface QueryFilter {
  field: string;
  op: FilterOp;
  value: unknown;
}

export interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  where?: QueryFilter[];
  orderBy?: QueryOrderBy[];
  limit?: number;
  /** Opaque cursor returned by a previous query. Pass through unchanged. */
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface Transaction {
  get<T>(collection: string, id: string): Promise<T | null>;
  create<T>(collection: string, id: string | null, data: T): void;
  update<T>(collection: string, id: string, partial: Partial<T>): void;
  delete(collection: string, id: string): void;
  increment(collection: string, id: string, field: string, by: number): void;
}

export interface DataStore {
  /** Read a single document by id. Returns null if not found. */
  get<T>(collection: string, id: string): Promise<T | null>;

  /**
   * Create a document. If id is null, the adapter generates one and returns
   * the new id. If id is provided, the adapter uses it (overwrite semantics
   * are adapter-specific — most reject duplicates; use update for upsert).
   */
  create<T>(collection: string, id: string | null, data: T): Promise<string>;

  /** Partial update. Fields not in `partial` are untouched. */
  update<T>(collection: string, id: string, partial: Partial<T>): Promise<void>;

  /** Delete a document. Idempotent — succeeds if the doc doesn't exist. */
  delete(collection: string, id: string): Promise<void>;

  /** Paginated query. Cursor is opaque; pass back nextCursor for the next page. */
  query<T>(collection: string, opts: QueryOptions): Promise<PaginatedResult<T>>;

  /** Count matching documents. Adapter may approximate for very large sets. */
  count(collection: string, opts: Pick<QueryOptions, 'where'>): Promise<number>;

  /** Atomic increment of a numeric field. Negative values decrement. */
  increment(
    collection: string,
    id: string,
    field: string,
    by: number,
  ): Promise<void>;

  /** Atomically add elements to an array field, preserving uniqueness. */
  arrayUnion<T>(
    collection: string,
    id: string,
    field: string,
    values: T[],
  ): Promise<void>;

  /** Atomically remove elements from an array field. */
  arrayRemove<T>(
    collection: string,
    id: string,
    field: string,
    values: T[],
  ): Promise<void>;

  /** Atomically delete a field from a document (sentinel-based in Firestore). */
  deleteField(collection: string, id: string, field: string): Promise<void>;

  /** Run a function inside a transaction. Adapter retries on conflict. */
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;

  /**
   * Get a DataStore scoped to a subcollection under a parent document.
   * SQL adapters typically flatten this to a child table with a parent_id
   * column — repositories don't need to know.
   */
  subcollection(
    parentCollection: string,
    parentId: string,
    childCollection: string,
  ): DataStore;
}
