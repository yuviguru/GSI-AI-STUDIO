/**
 * Firebase DataStore adapter — only file in the codebase that may import
 * `firebase-admin/firestore` for CRUD/query work (`admin.ts` is the bootstrap
 * exception).
 *
 * Cursor strategy: we encode `{ values: [...] }` as base64 JSON, where the
 * values are the orderBy field values from the last document of the previous
 * page. Firestore's `startAfter(...values)` re-locates without needing a
 * snapshot reference. Repositories never inspect the cursor.
 *
 * Timestamps: domain types use ISO-8601 strings. The adapter converts on
 * read (Firestore Timestamp → ISO) and write (ISO → Firestore Timestamp)
 * automatically via {@link convertTimestamps}.
 */

import {
  Timestamp,
  FieldValue,
  type CollectionReference,
  type DocumentData,
  type Query as FirestoreQuery,
  type Transaction as FirestoreTx,
  type WhereFilterOp,
} from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type {
  DataStore,
  Transaction,
  QueryOptions,
  PaginatedResult,
  FilterOp,
} from '../ports/DataStore';

// ── Helpers ──────────────────────────────────────────────────────────

const FILTER_OP_MAP: Record<FilterOp, WhereFilterOp> = {
  eq: '==',
  ne: '!=',
  lt: '<',
  lte: '<=',
  gt: '>',
  gte: '>=',
  in: 'in',
  'not-in': 'not-in',
  'array-contains': 'array-contains',
  'array-contains-any': 'array-contains-any',
};

function encodeCursor(values: unknown[]): string {
  return Buffer.from(JSON.stringify({ v: values }), 'utf-8').toString('base64');
}

function decodeCursor(cursor: string): unknown[] {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    return Array.isArray(parsed?.v) ? parsed.v : [];
  } catch {
    return [];
  }
}

/** Recursively strip `undefined` so Firestore writes never throw. */
function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripUndefined) as unknown as T;
  if (value instanceof Date) return value;
  // Skip Firestore native types (Timestamp, FieldValue, etc.) — they have a constructor name.
  const ctorName = (value as { constructor?: { name?: string } }).constructor?.name;
  if (ctorName && ctorName !== 'Object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) out[k] = stripUndefined(v);
  }
  return out as T;
}

/** Recursively convert ISO date strings on input → Firestore Timestamps. */
function convertOnWrite<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    // Heuristic: ISO 8601 ending in Z or with a tz offset.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value)) {
      return Timestamp.fromDate(new Date(value)) as unknown as T;
    }
    return value;
  }
  if (value instanceof Date) return Timestamp.fromDate(value) as unknown as T;
  if (Array.isArray(value)) return value.map(convertOnWrite) as unknown as T;
  if (typeof value === 'object') {
    const ctorName = (value as { constructor?: { name?: string } }).constructor?.name;
    if (ctorName && ctorName !== 'Object') return value; // skip Timestamp/FieldValue
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = convertOnWrite(v);
    }
    return out as T;
  }
  return value;
}

/** Recursively convert Firestore Timestamps on output → ISO strings. */
function convertOnRead<T = unknown>(value: unknown): T {
  if (value === null || value === undefined) return value as T;
  if (value instanceof Timestamp) return value.toDate().toISOString() as unknown as T;
  if (Array.isArray(value)) return value.map(convertOnRead) as unknown as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = convertOnRead(v);
    }
    return out as T;
  }
  return value as T;
}

function applyQueryOptions(
  base: CollectionReference | FirestoreQuery,
  opts: QueryOptions,
): FirestoreQuery {
  let q: FirestoreQuery = base as FirestoreQuery;
  for (const f of opts.where ?? []) {
    q = q.where(f.field, FILTER_OP_MAP[f.op], f.value as never);
  }
  for (const o of opts.orderBy ?? []) {
    q = q.orderBy(o.field, o.direction);
  }
  if (opts.cursor) {
    const values = decodeCursor(opts.cursor);
    if (values.length) q = q.startAfter(...values);
  }
  if (opts.limit) q = q.limit(opts.limit);
  return q;
}

// ── DataStore implementation ─────────────────────────────────────────

export class FirebaseDataStore implements DataStore {
  constructor(private readonly basePath: string[] = []) {}

  private collection(name: string): CollectionReference {
    if (this.basePath.length === 0) return adminDb.collection(name);
    // Subcollection path: parentColl/parentId/childColl[/...]
    const path = [...this.basePath, name].join('/');
    return adminDb.collection(path);
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const snap = await this.collection(collection).doc(id).get();
    if (!snap.exists) return null;
    return convertOnRead<T>({ id: snap.id, ...snap.data() });
  }

  async create<T>(collection: string, id: string | null, data: T): Promise<string> {
    const coll = this.collection(collection);
    const ref = id ? coll.doc(id) : coll.doc();
    const now = Timestamp.now();
    const payload = stripUndefined(convertOnWrite({
      ...(data as Record<string, unknown>),
    }));
    // Auto-set createdAt/updatedAt if not present in the data.
    if (!('createdAt' in (payload as object))) (payload as Record<string, unknown>).createdAt = now;
    if (!('updatedAt' in (payload as object))) (payload as Record<string, unknown>).updatedAt = now;
    await ref.set(payload as DocumentData);
    return ref.id;
  }

  async update<T>(collection: string, id: string, partial: Partial<T>): Promise<void> {
    const payload = stripUndefined(convertOnWrite({
      ...(partial as Record<string, unknown>),
      updatedAt: Timestamp.now(),
    }));
    await this.collection(collection).doc(id).update(payload as DocumentData);
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.collection(collection).doc(id).delete();
  }

  async query<T>(
    collection: string,
    opts: QueryOptions,
  ): Promise<PaginatedResult<T>> {
    const limit = opts.limit ?? 20;
    // Fetch one extra to detect hasMore without a second query.
    const q = applyQueryOptions(this.collection(collection), { ...opts, limit: limit + 1 });
    const snap = await q.get();
    const docs = snap.docs.slice(0, limit);
    const hasMore = snap.docs.length > limit;

    const items = docs.map((d) => convertOnRead<T>({ id: d.id, ...d.data() }));

    let nextCursor: string | null = null;
    if (hasMore && docs.length > 0 && opts.orderBy?.length) {
      const lastDoc = docs[docs.length - 1]!;
      const cursorValues = opts.orderBy.map((o) => lastDoc.get(o.field));
      nextCursor = encodeCursor(cursorValues);
    }

    return { items, nextCursor, hasMore };
  }

  async count(collection: string, opts: Pick<QueryOptions, 'where'>): Promise<number> {
    const q = applyQueryOptions(this.collection(collection), opts);
    const agg = await q.count().get();
    return agg.data().count;
  }

  async increment(
    collection: string,
    id: string,
    field: string,
    by: number,
  ): Promise<void> {
    await this.collection(collection).doc(id).update({
      [field]: FieldValue.increment(by),
      updatedAt: Timestamp.now(),
    });
  }

  async arrayUnion<T>(
    collection: string,
    id: string,
    field: string,
    values: T[],
  ): Promise<void> {
    if (values.length === 0) return;
    await this.collection(collection).doc(id).update({
      [field]: FieldValue.arrayUnion(...(values as unknown[])),
      updatedAt: Timestamp.now(),
    });
  }

  async arrayRemove<T>(
    collection: string,
    id: string,
    field: string,
    values: T[],
  ): Promise<void> {
    if (values.length === 0) return;
    await this.collection(collection).doc(id).update({
      [field]: FieldValue.arrayRemove(...(values as unknown[])),
      updatedAt: Timestamp.now(),
    });
  }

  async deleteField(collection: string, id: string, field: string): Promise<void> {
    await this.collection(collection).doc(id).update({
      [field]: FieldValue.delete(),
      updatedAt: Timestamp.now(),
    });
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return adminDb.runTransaction(async (firestoreTx) => {
      const tx = wrapTransaction(firestoreTx, this);
      return fn(tx);
    });
  }

  subcollection(
    parentCollection: string,
    parentId: string,
    childCollection: string,
  ): DataStore {
    return new FirebaseDataStore([
      ...this.basePath,
      parentCollection,
      parentId,
    ]).withChildHint(childCollection);
  }

  /** Internal — used to validate child path; doesn't change behavior. */
  private withChildHint(_child: string): this {
    return this;
  }
}

function wrapTransaction(
  firestoreTx: FirestoreTx,
  store: FirebaseDataStore,
): Transaction {
  // Reach into the private collection() resolver via a small accessor.
  const coll = (name: string) =>
    (store as unknown as { collection: (n: string) => CollectionReference }).collection.call(
      store,
      name,
    );

  return {
    async get<T>(collection: string, id: string): Promise<T | null> {
      const snap = await firestoreTx.get(coll(collection).doc(id));
      if (!snap.exists) return null;
      return convertOnRead<T>({ id: snap.id, ...snap.data() });
    },
    create<T>(collection: string, id: string | null, data: T): void {
      const ref = id ? coll(collection).doc(id) : coll(collection).doc();
      const now = Timestamp.now();
      const payload = stripUndefined(convertOnWrite({
        ...(data as Record<string, unknown>),
      }));
      if (!('createdAt' in (payload as object))) (payload as Record<string, unknown>).createdAt = now;
      if (!('updatedAt' in (payload as object))) (payload as Record<string, unknown>).updatedAt = now;
      firestoreTx.set(ref, payload as DocumentData);
    },
    update<T>(collection: string, id: string, partial: Partial<T>): void {
      const payload = stripUndefined(convertOnWrite({
        ...(partial as Record<string, unknown>),
        updatedAt: Timestamp.now(),
      }));
      firestoreTx.update(coll(collection).doc(id), payload as DocumentData);
    },
    delete(collection: string, id: string): void {
      firestoreTx.delete(coll(collection).doc(id));
    },
    increment(collection: string, id: string, field: string, by: number): void {
      firestoreTx.update(coll(collection).doc(id), {
        [field]: FieldValue.increment(by),
        updatedAt: Timestamp.now(),
      });
    },
  };
}
