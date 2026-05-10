# Backend Abstraction Layer

Backend-neutral interfaces for data, auth, and storage. Application code talks to these ports; one adapter per backend (Firebase today, Supabase/Postgres tomorrow) implements them.

## Architecture

```
lib/backend/
├── ports/                ← interfaces only
│   ├── DataStore.ts
│   ├── AuthProvider.ts
│   ├── StorageProvider.ts
│   └── index.ts
├── adapters/             ← one file per backend (only place SDKs live)
│   ├── firebase.ts       ← bundles the three Firebase ports
│   ├── firebaseDataStore.ts
│   ├── firebaseAuth.ts
│   └── firebaseStorage.ts
└── index.ts              ← env-var-selected `backend` singleton
```

## Usage

```ts
import { backend } from '@/lib/backend';

// Data
const creation = await backend.data.get<Creation>('creations', id);
const newId = await backend.data.create<Creation>('creations', null, payload);
await backend.data.increment('creations', id, 'viewCount', 1);
await backend.data.transaction(async (tx) => {
  const session = await tx.get<Session>('sessions', sid);
  tx.update('sessions', sid, { creationCount: (session?.creationCount ?? 0) + 1 });
});

// Auth
const user = await backend.auth.verifyToken(idToken);
await backend.auth.setCustomClaims(user.id, { role: 'parent', plan: 'pro' });

// Storage
const { url, headers } = await backend.storage.getUploadUrl('uploads/foo.png', {
  contentType: 'image/png',
  expiresInSec: 600,
});
```

## Swapping Backends

1. Add `lib/backend/adapters/<name>.ts` implementing `Backend`.
2. Wire it up in `lib/backend/index.ts`'s `pickBackend()`.
3. Set `BACKEND=<name>` in `.env`.

That's it. No other file changes.

## Required ESLint Rule (manual setup)

Add this to `.eslintrc.json` to enforce the abstraction (the config-protection hook blocks automated edits — apply manually):

```json
{
  "overrides": [
    {
      "files": ["**/*.ts", "**/*.tsx"],
      "excludedFiles": [
        "lib/backend/adapters/**",
        "lib/firebase/admin.ts",
        "lib/firebase/client.ts",
        "lib/ai/adapters/**"
      ],
      "rules": {
        "no-restricted-imports": ["error", {
          "paths": [
            { "name": "firebase-admin", "message": "Use @/lib/backend instead." },
            { "name": "firebase-admin/firestore", "message": "Use @/lib/backend instead." },
            { "name": "firebase-admin/auth", "message": "Use @/lib/backend instead." },
            { "name": "firebase-admin/storage", "message": "Use @/lib/backend instead." },
            { "name": "@supabase/supabase-js", "message": "Use @/lib/backend instead." },
            { "name": "pg", "message": "Use @/lib/backend instead." }
          ]
        }]
      }
    },
    {
      "files": [
        "app/api/**/*.ts",
        "lib/capabilities/**/*.ts",
        "lib/repositories/**/*.ts",
        "lib/channels/**/*.ts",
        "lib/mcp/**/*.ts"
      ],
      "rules": {
        "no-restricted-imports": ["error", {
          "paths": [
            { "name": "@anthropic-ai/sdk", "message": "Use @/lib/ai/router instead." },
            { "name": "groq-sdk", "message": "Use @/lib/ai/router instead." },
            { "name": "openai", "message": "Use @/lib/ai/router instead." },
            { "name": "@google/genai", "message": "Use @/lib/ai/router instead." },
            { "name": "replicate", "message": "Use @/lib/ai/router instead." }
          ]
        }]
      }
    }
  ]
}
```

## Migration Status

| Service | Status | Notes |
|---|---|---|
| `creationService` → `creationRepository` | ✅ Migrated | Re-export shim preserves callers |
| `sessionService` | ⏳ Deferred | Uses `FieldValue.arrayUnion`, batched writes — needs port extensions |
| `userService` | ⏳ Deferred | Uses `FieldValue.delete`, `FieldValue.arrayUnion` — needs port extensions |
| `bookService`, `performanceService`, ~20 others | ⏳ Deferred | Migrate as touched, or in batch when swapping backends |

**Why deferred**: the architecture works today (creationRepository proves the pattern). The deferred services use Firestore-specific operations that need either (a) port extensions like `arrayUnion()`, `arrayRemove()`, `deleteField()`, or (b) read-modify-write rewrites inside transactions. We'll migrate them when we actually swap backends — at which point we know exactly which Firestore operations to port.

**Future port additions (when needed)**:
```ts
arrayUnion<T>(collection: string, id: string, field: string, values: T[]): Promise<void>;
arrayRemove<T>(collection: string, id: string, field: string, values: T[]): Promise<void>;
deleteField(collection: string, id: string, field: string): Promise<void>;
batch(): WriteBatch;
```

## Cursor Strategy

`QueryOptions.cursor` is an opaque base64-encoded JSON string. Repositories pass it through unchanged — the adapter encodes/decodes its own pagination state.

- **Firestore adapter**: encodes `{ v: [...orderByValues] }` to use `startAfter(...)`.
- **Postgres/Supabase adapter (future)**: would encode `{ v: [lastValue, lastId] }` for keyset pagination.

## Timestamp Strategy

Domain types use ISO-8601 strings. The Firebase adapter automatically converts:
- **On write**: ISO strings matching `\d{4}-\d{2}-\d{2}T...` → `Timestamp`
- **On read**: `Timestamp` → ISO string

Repositories never see backend-native timestamp types.
