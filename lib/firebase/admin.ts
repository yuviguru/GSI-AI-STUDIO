import { initializeApp, getApps, cert, type ServiceAccount, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Load Firebase service account from env var or file.
 * On Netlify, the build writes the base64-encoded service account to a file
 * to avoid the 4KB Lambda env var limit. Falls back to the env var for local dev.
 */
function getServiceAccount(): ServiceAccount {
  // Try file first (Netlify deploys — avoids 4KB Lambda env var limit)
  const saPath = join(process.cwd(), '.firebase-sa.json');
  if (existsSync(saPath)) {
    return JSON.parse(readFileSync(saPath, 'utf-8')) as ServiceAccount;
  }

  // Fall back to env var (local dev)
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!encoded || encoded === 'REPLACE-ME') {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is not configured. ' +
      'See .env.example for instructions.'
    );
  }
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8')) as ServiceAccount;
}

function getApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }
  return initializeApp({ credential: cert(getServiceAccount()) });
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
