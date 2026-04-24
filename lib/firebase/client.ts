import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  browserLocalPersistence,
  setPersistence,
  type ConfirmationResult,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Firebase is configured when NEXT_PUBLIC_FIREBASE_API_KEY is set in the env.
 * Without it, we still initialize the SDK with a safe placeholder so the app
 * doesn't crash — any actual auth/db call will simply fail on the network side,
 * and callers should branch on `isFirebaseConfigured` where behaviour matters.
 */
export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
);

if (!isFirebaseConfigured && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn(
    '[firebase] NEXT_PUBLIC_FIREBASE_API_KEY is not set — running in degraded mode. Auth/Firestore calls will no-op.',
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'DEMO_KEY_NOT_CONFIGURED',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'demo.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:000000000000:web:demo',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;

export const auth: Auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

// ─── Phone Auth Helpers ─────────────────────────────────────────────────────

let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Get or create an invisible reCAPTCHA verifier.
 * Must be called in a browser context with a valid DOM container.
 *
 * Handles cleanup of previous reCAPTCHA instances to avoid
 * "reCAPTCHA has already been rendered in this element" errors.
 */
export function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  // Clear any existing verifier
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // Ignore if already cleared
    }
    recaptchaVerifier = null;
  }

  // Also clear the DOM container (reCAPTCHA injects iframes that persist)
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });

  return recaptchaVerifier;
}

/**
 * Send OTP to a phone number via Firebase Phone Auth.
 * Returns a ConfirmationResult that can be used to verify the OTP.
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  // Ensure persistence is set to local (survives page refresh)
  await setPersistence(auth, browserLocalPersistence);

  // Phone number must include country code (e.g., +91XXXXXXXXXX)
  const formattedPhone = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+91${phoneNumber.replace(/\D/g, '')}`;

  return signInWithPhoneNumber(auth, formattedPhone, verifier);
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  // Clean up reCAPTCHA verifier
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // Ignore
    }
    recaptchaVerifier = null;
  }

  await firebaseSignOut(auth);
}
