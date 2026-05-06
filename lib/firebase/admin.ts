import { initializeApp, getApps, cert, type ServiceAccount, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

/**
 * Load Firebase service account credentials.
 *
 * Priority:
 * 1. Individual env vars (Netlify deploys — avoids 4KB Lambda env var limit)
 * 2. Base64-encoded JSON env var (local dev with .env.local)
 */
function getServiceAccount(): ServiceAccount {
  // Option 1: Individual credential fields (Netlify — smallest env var footprint)
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey } as ServiceAccount;
  }

  // Option 2: Base64-encoded full service account JSON (local dev)
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (encoded && encoded !== 'REPLACE-ME') {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8')) as ServiceAccount;
  }

  throw new Error(
    'Firebase credentials not configured. ' +
    'Set FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or FIREBASE_SERVICE_ACCOUNT. ' +
    'See .env.example for instructions.'
  );
}

/**
 * Resolve the Firebase Storage bucket name.
 *
 * Priority:
 * 1. FIREBASE_STORAGE_BUCKET (server-only override)
 * 2. NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (matches client SDK config)
 * 3. `<projectId>.appspot.com` (legacy default — works for most projects
 *    created before the .firebasestorage.app domain rollout)
 *
 * Required for `adminStorage.bucket()` (no-arg) to resolve a default
 * bucket. Without this, schoolAssets and the PERF-001 asset service
 * both throw `storage/invalid-argument`.
 */
function getStorageBucket(): string | undefined {
  const explicit =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (explicit) return explicit;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return projectId ? `${projectId}.appspot.com` : undefined;
}

function getApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }
  const storageBucket = getStorageBucket();
  return initializeApp({
    credential: cert(getServiceAccount()),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

// Lazy singletons — avoids crashes during Next.js build when env vars aren't set
let _app: App | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;

function ensureApp(): App {
  if (!_app) _app = getApp();
  return _app;
}

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(ensureApp());
    return Reflect.get(_auth, prop);
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) _db = getFirestore(ensureApp());
    return Reflect.get(_db, prop);
  },
});

export const adminStorage: Storage = new Proxy({} as Storage, {
  get(_, prop) {
    if (!_storage) _storage = getStorage(ensureApp());
    return Reflect.get(_storage, prop);
  },
});
