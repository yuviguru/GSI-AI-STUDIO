# Backend-Agnostic Architecture Plan

**Date**: 2026-05-10
**Status**: Draft for review
**Goal**: Refactor so that swapping Firebase → Supabase → custom Postgres → anything else requires changing **one config line + writing one adapter file**, not touching any business logic, API route, or component.

---

## TL;DR

1. **Use Ports & Adapters (Hexagonal-lite)**. Define backend-neutral interfaces (ports). Each backend gets one adapter that implements them. Application code only ever talks to the ports.
2. **The current `lib/firebase/*Service.ts` files are already the seam** — they're 70% of the way there. We just need to (a) extract the interface, (b) move them under `lib/backend/`, (c) make the Firebase implementation one of N possible adapters.
3. **Don't refactor everything at once**. Start with the 3 highest-traffic services (`creationService`, `sessionService`, `userService`). Leave the long tail (CEO studio, school admin, comms) on direct-Firebase imports until you actually need to swap.
4. **Effort**: ~3–5 days for the foundation + first 3 services. ~2 weeks total to fully port. A second adapter (Supabase) takes ~1 week once the foundation is in.

---

## 1. Current State (What Needs Changing)

### What's already good
- Service layer exists: `lib/firebase/creationService.ts`, `sessionService.ts`, `userService.ts`, etc.
- API routes call services, not Firestore directly (e.g. `app/api/ai/story/route.ts` → `saveCreation()`)
- Types live separately in `types/*.types.ts` — already backend-neutral

### What's leaking Firebase
- Services import `firebase-admin/firestore` directly (`creationService.ts:1`)
- Services import `adminDb` from `./admin` directly
- Firebase types (`Timestamp`, `FieldValue`, `DocumentSnapshot`) leak into return values
- Storage uses `firebase-admin/storage` directly in `lib/storage/assetService.ts`
- Auth uses `firebase-admin/auth` in `lib/auth/*`
- Firestore rules in `firestore.rules` are Firebase-specific (a Supabase port = RLS policies)

### What this means
Today, swapping to Supabase means rewriting ~25 service files + auth + storage + rules. With ports, it means writing **one** file: `lib/backend/adapters/supabase.ts`.

---

## 2. The Architecture

```
┌─────────────────────────────────────────────────┐
│  Application Layer                              │
│  (API routes, React hooks, components)          │
└────────────────────┬────────────────────────────┘
                     │
                     │ depends on (interface)
                     ▼
┌─────────────────────────────────────────────────┐
│  Repository Layer (lib/repositories/)           │
│  CreationRepository, SessionRepository, ...     │
│  (Pure domain logic — knows nothing of FB/SB)   │
└────────────────────┬────────────────────────────┘
                     │
                     │ uses
                     ▼
┌─────────────────────────────────────────────────┐
│  Backend Ports (lib/backend/ports/)             │
│  DataStore, AuthProvider, StorageProvider,      │
│  RealtimeProvider                               │
│  (Interfaces — no implementation)               │
└────────────────────┬────────────────────────────┘
                     │
                     │ implemented by
                     ▼
┌─────────────────────────────────────────────────┐
│  Adapters (lib/backend/adapters/)               │
│  firebase.ts  supabase.ts  postgres.ts ...      │
│  (One file per backend — only file that         │
│   imports firebase-admin / @supabase/* / pg)    │
└─────────────────────────────────────────────────┘
```

**Rule**: outside `lib/backend/adapters/*`, no file may import `firebase-admin/*`, `@supabase/*`, `pg`, etc. Enforced by an ESLint rule (see §6).

---

## 3. The Ports (Interfaces)

Four ports cover everything an adapter must implement.

### 3.1 `DataStore` — CRUD + queries

```ts
// lib/backend/ports/DataStore.ts

export interface QueryFilter {
  field: string;
  op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'array-contains';
  value: unknown;
}

export interface QueryOptions {
  where?: QueryFilter[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  cursor?: string; // opaque, adapter-specific encoding
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface DataStore {
  // Single doc
  get<T>(collection: string, id: string): Promise<T | null>;
  create<T>(collection: string, id: string | null, data: T): Promise<string>;
  update<T>(collection: string, id: string, partial: Partial<T>): Promise<void>;
  delete(collection: string, id: string): Promise<void>;

  // Queries
  query<T>(collection: string, opts: QueryOptions): Promise<PaginatedResult<T>>;
  count(collection: string, opts: Pick<QueryOptions, 'where'>): Promise<number>;

  // Atomic
  increment(collection: string, id: string, field: string, by: number): Promise<void>;
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;

  // Subcollections (optional; flatten with paths in SQL adapters)
  subcollection(parentCollection: string, parentId: string, child: string): DataStore;
}

export interface Transaction {
  get<T>(collection: string, id: string): Promise<T | null>;
  create<T>(collection: string, id: string | null, data: T): void;
  update<T>(collection: string, id: string, partial: Partial<T>): void;
  delete(collection: string, id: string): void;
}
```

**Why these ops**: this is the minimum set that supports every current Firestore call I can see in the codebase. `transaction` covers badge unlocks; `increment` covers `creationCount`/`viewCount`; `subcollection` covers `users/{uid}/kids`.

### 3.2 `AuthProvider`

```ts
// lib/backend/ports/AuthProvider.ts

export interface AuthUser {
  id: string;
  phone?: string;
  email?: string;
  customClaims?: Record<string, unknown>;
}

export interface AuthProvider {
  verifyToken(token: string): Promise<AuthUser>;
  getUser(id: string): Promise<AuthUser | null>;
  setCustomClaims(id: string, claims: Record<string, unknown>): Promise<void>;
  createSessionCookie(idToken: string, expiresInMs: number): Promise<string>;
  verifySessionCookie(cookie: string): Promise<AuthUser>;
}
```

### 3.3 `StorageProvider`

```ts
// lib/backend/ports/StorageProvider.ts

export interface UploadUrlOptions {
  contentType: string;
  expiresInSec: number;
  maxSizeBytes?: number;
}

export interface StorageProvider {
  getUploadUrl(path: string, opts: UploadUrlOptions): Promise<{ url: string; method: 'PUT' | 'POST' }>;
  getDownloadUrl(path: string, expiresInSec?: number): Promise<string>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
```

### 3.4 `RealtimeProvider` (optional, defer until needed)

```ts
// lib/backend/ports/RealtimeProvider.ts

export interface RealtimeProvider {
  subscribe<T>(
    collection: string,
    opts: QueryOptions,
    onChange: (items: T[]) => void,
  ): () => void; // returns unsubscribe
}
```

We barely use realtime today (mostly server-side reads). Skip this port for v1 — add it the day we need it.

---

## 4. The Backend Singleton

```ts
// lib/backend/index.ts

import { firebaseAdapter } from './adapters/firebase';
import { supabaseAdapter } from './adapters/supabase'; // future
import type { DataStore, AuthProvider, StorageProvider } from './ports';

export interface Backend {
  data: DataStore;
  auth: AuthProvider;
  storage: StorageProvider;
}

function pickBackend(): Backend {
  const choice = process.env.BACKEND ?? 'firebase';
  switch (choice) {
    case 'firebase': return firebaseAdapter();
    case 'supabase': return supabaseAdapter(); // future
    default: throw new Error(`Unknown backend: ${choice}`);
  }
}

export const backend: Backend = pickBackend();
```

**Swapping backends = changing `BACKEND=firebase` to `BACKEND=supabase` in `.env`.** That's it.

---

## 5. The Repository Layer (Replaces `lib/firebase/*Service.ts`)

Move business logic out of `lib/firebase/*Service.ts` into `lib/repositories/*Repository.ts`. Repositories use `backend.data` instead of `adminDb`.

### Before (current)
```ts
// lib/firebase/creationService.ts
import { adminDb } from './admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function saveCreation(input: SaveCreationInput): Promise<Creation> {
  const docRef = adminDb.collection('creations').doc();
  await docRef.set({ ...input, createdAt: Timestamp.now() });
  return { ...input, id: docRef.id };
}
```

### After (target)
```ts
// lib/repositories/creationRepository.ts
import { backend } from '@/lib/backend';

export async function saveCreation(input: SaveCreationInput): Promise<Creation> {
  const id = await backend.data.create<CreationDoc>('creations', null, {
    ...stripUndefined(input),
    createdAt: new Date().toISOString(), // ISO string — adapter converts as needed
    updatedAt: new Date().toISOString(),
  });
  return { ...input, id };
}
```

**Key wins**:
- No `firebase-admin` import
- No `Timestamp` — use ISO strings; adapter converts to native type internally
- Identical signature, so API routes don't change

### Type strategy
- **Domain types** (`types/creation.types.ts`) — backend-neutral. Use `string` for timestamps (ISO 8601).
- **Adapter-internal types** — adapters convert between domain types and backend-native types (Firestore `Timestamp`, Postgres `timestamptz`, etc.) at the boundary.

---

## 6. Enforcement (so future code doesn't re-leak)

Add to `eslint.config.js`:

```js
{
  files: ['**/*.ts', '**/*.tsx'],
  ignores: ['lib/backend/adapters/**'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        { name: 'firebase-admin', message: 'Use lib/backend instead.' },
        { name: 'firebase-admin/firestore', message: 'Use lib/backend instead.' },
        { name: 'firebase-admin/auth', message: 'Use lib/backend instead.' },
        { name: 'firebase-admin/storage', message: 'Use lib/backend instead.' },
        { name: '@supabase/supabase-js', message: 'Use lib/backend instead.' },
        { name: 'pg', message: 'Use lib/backend instead.' },
      ],
      patterns: [
        { group: ['firebase-admin/*'], message: 'Use lib/backend instead.' },
      ],
    }],
  },
}
```

This makes the abstraction self-enforcing. Any developer who tries to import `firebase-admin` outside the adapter folder gets a build error.

---

## 7. Cursor / Pagination Strategy

The trickiest port detail. Firestore uses opaque `DocumentSnapshot` cursors; SQL uses `(orderByValue, id)` keyset pagination.

**Solution**: cursors are **opaque base64-encoded JSON strings** in the port contract.

- Firebase adapter encodes the snapshot's path
- Supabase/Postgres adapter encodes `{ lastValue, lastId }` for keyset pagination

The repository layer just passes the cursor through — never inspects it.

---

## 8. Migration Plan (Phased — Don't Boil the Ocean)

### Phase 0 — Foundation (3 days)
1. Create `lib/backend/ports/` with the 3 interfaces (DataStore, AuthProvider, StorageProvider).
2. Create `lib/backend/adapters/firebase.ts` — wraps current `firebase-admin/*` calls behind the port interfaces.
3. Create `lib/backend/index.ts` with the env-var-based selector.
4. Add the ESLint rule (with `lib/firebase/**` temporarily in the ignore list — we remove it as we migrate).
5. Write port-level contract tests (`backend.spec.ts`) that any adapter must pass. The Firebase adapter must pass them all before we proceed.

### Phase 1 — High-traffic services (3 days)
Migrate the 3 services hit by every request:
1. `lib/firebase/creationService.ts` → `lib/repositories/creationRepository.ts`
2. `lib/firebase/sessionService.ts` → `lib/repositories/sessionRepository.ts`
3. `lib/firebase/userService.ts` → `lib/repositories/userRepository.ts`

For each: keep the old file as a one-line re-export shim during transition, so API routes don't break:
```ts
// lib/firebase/creationService.ts (temporary shim)
export * from '@/lib/repositories/creationRepository';
```

Once all callers are updated, delete the shim. Remove `lib/firebase/creationService.ts` from the ESLint ignore list.

### Phase 2 — Auth + Storage (2 days)
1. Migrate `lib/auth/*` to use `backend.auth`.
2. Migrate `lib/storage/assetService.ts` to use `backend.storage`.

### Phase 3 — Long tail (~1 week, can be lazy)
Migrate remaining services as you touch them for other work. No big-bang.

### Phase 4 — Add Supabase adapter (when needed, ~5–7 days)
1. Create `lib/backend/adapters/supabase.ts`. Implements all three ports.
2. Run port-level contract tests against it — they all pass before we proceed.
3. Run staging environment with `BACKEND=supabase` for 1 week. Compare behavior.
4. Migrate data: one-time script that reads from Firestore and writes to Postgres.
5. Flip prod env var. Done.

---

## 9. What This DOESN'T Solve (Be Honest)

- **Firestore Rules → Supabase RLS**: security rules are backend-specific. You'll need to translate `firestore.rules` to RLS policies when you add the Supabase adapter. This is unavoidable, but it's contained — one file's worth of work.
- **Migration data movement**: ports don't migrate your data for you. A one-time ETL script is still needed when you actually swap.
- **Firestore-specific features**: anything using `arrayUnion`, complex compound queries with `OR`, or geo-queries needs a portable equivalent. Audit as we migrate each service.
- **Performance characteristics**: a query that's fast in Firestore (index lookup) might need a Postgres index added on the other side. The port hides the API but not the perf.

---

## 10. Tradeoffs

**Pros**
- ✅ Plug any backend with one new adapter file
- ✅ Testable — mock `backend.data` in unit tests, no Firebase emulator needed
- ✅ Can run two backends side-by-side during migration (dual-write window)
- ✅ ESLint rule prevents future leakage

**Cons**
- ❌ One layer of indirection — slight perf cost (negligible)
- ❌ Lowest-common-denominator API — can't use Firestore's `arrayUnion` directly (workaround: do read-modify-write in a transaction)
- ❌ Some upfront refactor work (~10 days total)

**The cons are manageable; the pros compound forever.**

---

## 11. What I'd Do This Week

1. **Day 1–2**: Build Phase 0 foundation (ports, Firebase adapter, ESLint rule, contract tests).
2. **Day 3–5**: Migrate `creationRepository`, `sessionRepository`, `userRepository`. These cover ~80% of all DB calls.
3. **Defer everything else** until the pilot tells us we actually need to migrate.

This gets the architecture right *now* (cheap when you have ~10 services) without locking in 3 weeks of work before you have users.

---

## 12. Open Questions

1. Do we want to support `BACKEND=firebase+supabase` dual-write mode for safe migration? (Doable — adapter that wraps two and writes to both.)
2. For the `RealtimeProvider`, do we have any current realtime UX that would break if we deferred it? (I don't think so, but worth confirming.)
3. Should we abstract the AI providers (Claude/Groq, Pixazo/Replicate) the same way? They're already 80% there with `lib/ai/imageProvider.ts`. Same pattern would let us swap LLMs trivially.

---

## 13. Source References

- Current service example: `lib/firebase/creationService.ts:1` (imports `firebase-admin/firestore` directly)
- AI provider abstraction (already done well — model for our backend ports): `lib/ai/imageProvider.ts:64`
- Storage that needs porting: `lib/storage/assetService.ts`
- Firestore-specific rules: `firestore.rules`
- Pricing/cost context: `docs/infra-cost-and-migration-plan.md`
