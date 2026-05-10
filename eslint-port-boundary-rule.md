# ESLint Port-Boundary Rule (manual apply)

This rule enforces the architecture boundaries documented in
`docs/architecture.md` and `lib/backend/README.md`. The local
`config-protection` Claude Code hook prevents automated edits to
`.eslintrc.json`, so apply this manually.

## What it does

- **Blocks any direct import of backend SDKs** (`firebase-admin`, `@supabase/*`,
  `pg`) from anywhere outside `lib/backend/adapters/*` and the legacy
  `lib/firebase/*Service.ts` shims.
- **Blocks any direct import of AI SDKs** (`@anthropic-ai/sdk`, `groq-sdk`,
  `openai`, `replicate`) from anywhere outside `lib/ai/adapters/*` and the
  legacy `lib/ai/*Client.ts` shims.

## Apply

Replace the contents of `.eslintrc.json` with:

```json
{
  "extends": "next/core-web-vitals",
  "overrides": [
    {
      "files": ["**/*.ts", "**/*.tsx"],
      "excludedFiles": [
        "lib/backend/adapters/**",
        "lib/firebase/admin.ts",
        "lib/firebase/client.ts",
        "lib/firebase/**Service.ts",
        "lib/storage/assetService.ts",
        "lib/auth/**",
        "lib/ai/adapters/**",
        "lib/ai/claudeClient.ts",
        "lib/ai/groqClient.ts",
        "lib/ai/musicClient.ts",
        "lib/ai/replicateClient.ts",
        "lib/ai/pixazoClient.ts",
        "lib/ai/pollinationsClient.ts",
        "lib/ai/comfyuiClient.ts",
        "lib/ai/imageProvider.ts",
        "lib/ai/imageSearchClient.ts",
        "lib/capabilities/imageStorage.ts"
      ],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "paths": [
              { "name": "firebase-admin", "message": "Use @/lib/backend instead." },
              { "name": "firebase-admin/firestore", "message": "Use @/lib/backend instead." },
              { "name": "firebase-admin/auth", "message": "Use @/lib/backend instead." },
              { "name": "firebase-admin/storage", "message": "Use @/lib/backend instead." },
              { "name": "firebase-admin/app", "message": "Use @/lib/backend instead." },
              { "name": "@supabase/supabase-js", "message": "Use @/lib/backend instead." },
              { "name": "pg", "message": "Use @/lib/backend instead." },
              { "name": "@anthropic-ai/sdk", "message": "Use @/lib/ai/router instead." },
              { "name": "groq-sdk", "message": "Use @/lib/ai/router instead." },
              { "name": "openai", "message": "Use @/lib/ai/router instead." },
              { "name": "replicate", "message": "Use @/lib/ai/router instead." }
            ]
          }
        ]
      }
    }
  ]
}
```

## Why the excludedFiles list is so long

The rule should ideally only carve out `lib/backend/adapters/**` and
`lib/ai/adapters/**`. The longer list reflects the migration state today
(see `lib/backend/README.md#Migration Status`):

- `lib/firebase/**Service.ts` — most still talk to `firebase-admin`
  directly. Migrating each one to use `backend.data` is documented as
  a follow-up; the rule should be tightened as services move over.
- `lib/storage/assetService.ts` — same.
- `lib/auth/**` — same.
- `lib/ai/*Client.ts` — wrapped by adapters but not yet deleted; the
  adapters import them.
- `lib/ai/imageProvider.ts` — pre-existing image router, superseded by
  `lib/ai/router/ImageRouter.ts`. Delete once all callers move over.
- `lib/capabilities/imageStorage.ts` — uses `adminStorage` directly for
  the buffer-upload path the StorageProvider port doesn't expose yet.

## Verification

After applying, run `pnpm lint`. The rule catches any new code that
bypasses the abstraction:

```ts
import { adminDb } from 'firebase-admin/firestore';   // ❌ ESLint error
import { backend } from '@/lib/backend';              // ✅ ok
```
