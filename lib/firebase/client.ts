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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
 */
export function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // Ignore if already cleared
    }
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
