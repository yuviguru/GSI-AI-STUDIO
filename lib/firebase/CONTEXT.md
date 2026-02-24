# Firebase Integration

## Purpose
Firebase SDK setup and utility functions for both client-side and server-side (Admin SDK) usage.

## Load References
@import /docs/architecture.md#components
@import /docs/security.md#authentication
@import /docs/data-model.md

## Structure
```
firebase/
├── config.ts           # Firebase client config (from env vars)
├── client.ts           # Firebase client SDK initialization (singleton)
├── admin.ts            # Firebase Admin SDK initialization (server-side only)
├── auth.ts             # Auth utilities: sendOtp, verifyToken, getCurrentUser
├── firestore.ts        # Firestore utilities: getDoc, setDoc, query helpers
└── storage.ts          # Cloud Storage utilities: upload, getUrl, delete
```

## Local Patterns
- Client SDK: initialized once, imported everywhere on client
- Admin SDK: initialized once, used only in API routes / Netlify Functions
- Never import Admin SDK in client components (tree-shaking won't help — it'll break)
- Use typed wrappers around Firestore operations (not raw SDK calls)
- All Firestore writes include `createdAt` / `updatedAt` server timestamps

## Environment Variables
```
# Client-side (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Server-side only
FIREBASE_SERVICE_ACCOUNT  # Base64-encoded service account JSON
```

## Related Code
@see /hooks/useAuth.ts              # Auth state hook (uses client SDK)
@see /hooks/useCreation.ts          # Creation CRUD (uses Firestore client)
@see /app/api/                      # API routes (use Admin SDK)
