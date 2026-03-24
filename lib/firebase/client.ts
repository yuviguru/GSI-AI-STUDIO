import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPhoneNumber as firebaseSignInWithPhone,
  RecaptchaVerifier as FirebaseRecaptchaVerifier,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence,
  type ConfirmationResult,
  type ApplicationVerifier,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Lazy initialization — avoids crashes during SSG when env vars aren't set
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
  return _app;
}

/** Firebase Auth instance (lazy — safe for SSG) */
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(getApp());
    return Reflect.get(_auth, prop);
  },
});

/** Firestore instance (lazy — safe for SSG) */
export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) _db = getFirestore(getApp());
    return Reflect.get(_db, prop);
  },
});

/** Cloud Storage instance (lazy — safe for SSG) */
export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    if (!_storage) _storage = getStorage(getApp());
    return Reflect.get(_storage, prop);
  },
});

const app: FirebaseApp = new Proxy({} as FirebaseApp, {
  get(_, prop) {
    return Reflect.get(getApp(), prop);
  },
});
export default app;

// ─── Phone Auth helpers ───────────────────────────────────────────────────────

/** Set auth persistence to local (survives browser restart) */
export async function initAuthPersistence(): Promise<void> {
  await setPersistence(auth, browserLocalPersistence);
}

/**
 * Create an invisible reCAPTCHA verifier attached to a container element.
 * Must be called client-side only.
 */
export function createRecaptchaVerifier(containerId: string): ApplicationVerifier {
  return new FirebaseRecaptchaVerifier(auth, containerId, { size: 'invisible' });
}

/**
 * Send OTP to the given phone number using Firebase Phone Auth.
 * Returns a ConfirmationResult that can be used to verify the OTP.
 */
export async function sendOtp(
  phoneNumber: string,
  recaptchaVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  return firebaseSignInWithPhone(auth, phoneNumber, recaptchaVerifier);
}

/**
 * Sign out and clear auth state.
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}
