import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCredential,
  linkWithCredential,
  PhoneAuthProvider,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  browserLocalPersistence,
  setPersistence,
  type Auth,
  type User,
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
 * Firebase internally marks a DOM element as "already rendered" and neither
 * `.clear()` nor emptying innerHTML resets that flag. The only reliable
 * fix is to swap the container element for a fresh one so the next
 * `new RecaptchaVerifier()` call sees a virgin DOM node.
 */
export function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  // 1. Tear down previous verifier instance
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // Ignore — may already be cleared or in a broken state
    }
    recaptchaVerifier = null;
  }

  // 2. Replace the container element entirely so Firebase sees a fresh node.
  //    This is the key fix — Firebase caches a "rendered" flag on the element
  //    and no amount of innerHTML clearing resets it.
  const oldContainer = document.getElementById(containerId);
  if (oldContainer?.parentNode) {
    const fresh = document.createElement('div');
    fresh.id = containerId;
    oldContainer.parentNode.replaceChild(fresh, oldContainer);
  }

  // 3. Clean up any orphaned reCAPTCHA iframes Firebase may have injected
  //    into <body> (invisible mode creates global elements).
  document
    .querySelectorAll('iframe[src*="recaptcha"]')
    .forEach((iframe) => iframe.remove());
  document
    .querySelectorAll('.grecaptcha-badge')
    .forEach((badge) => (badge as HTMLElement).remove());

  // 4. Create a fresh verifier on the new container
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });

  return recaptchaVerifier;
}

// ─── Anonymous Auth ────────────────────────────────────────────────────────

/**
 * Ensure the current user has Firebase Authentication — either anonymous or
 * phone-based. Called once during AuthProvider initialization.
 *
 * Anonymous users get a real Firebase UID from day one. When they later sign
 * up with phone, `linkWithCredential` upgrades the anonymous account in-place
 * (same UID, zero data migration needed).
 *
 * The anonymous UID is also stored in `gsi-session-id` localStorage so the
 * existing session-based rate limiting and creation tracking keeps working
 * without changes to 50+ API routes.
 */
export async function ensureAnonymousAuth(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  if (!isFirebaseConfigured) return null;

  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInAnonymously(auth);

    // Bridge: store anonymous UID as the session ID so the existing
    // useSession / fetchWithSession / X-Session-Id pipeline works unchanged.
    if (typeof window !== 'undefined' && !localStorage.getItem('gsi-session-id')) {
      localStorage.setItem('gsi-session-id', result.user.uid);
    }

    return result.user;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] Anonymous auth failed — falling back to UUID sessions:', err);
    return null;
  }
}

// ─── Phone Auth (OTP) ─────────────────────────────────────────────────────

/**
 * Send OTP to a phone number via PhoneAuthProvider.
 *
 * Returns a `verificationId` string (not a ConfirmationResult) so we have
 * full control over credential creation — needed for the link-or-fallback
 * flow in `verifyPhoneOtp`.
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier,
): Promise<string> {
  await setPersistence(auth, browserLocalPersistence);

  const formattedPhone = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+91${phoneNumber.replace(/\D/g, '')}`;

  const provider = new PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber(formattedPhone, verifier);
}

/** Result of phone OTP verification. */
export interface PhoneVerifyResult {
  user: User;
  /** True if the user was previously anonymous (just upgraded). */
  wasAnonymous: boolean;
  /**
   * Set when the phone was already linked to a different account (conflict).
   * The anonymous account's UID — caller should migrate its data.
   */
  conflictAnonymousUid?: string;
}

/**
 * Verify an OTP code and upgrade the current user to phone auth.
 *
 * Three outcomes:
 * 1. Anonymous → phone (link succeeded): same UID, zero migration.
 * 2. Anonymous → phone (conflict, phone already taken): signed into the
 *    existing phone account; `conflictAnonymousUid` is set so the caller
 *    can migrate data from the orphaned anonymous account.
 * 3. No current user → phone sign-in (edge case / fallback).
 */
export async function verifyPhoneOtp(
  verificationId: string,
  code: string,
): Promise<PhoneVerifyResult> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const currentUser = auth.currentUser;

  // ── Anonymous user → try to link phone ──
  if (currentUser?.isAnonymous) {
    try {
      const result = await linkWithCredential(currentUser, credential);
      return { user: result.user, wasAnonymous: true };
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      if (firebaseErr.code === 'auth/credential-already-in-use') {
        // Phone belongs to an existing account. Save the anonymous UID so
        // the caller can migrate its data, then sign into the real account.
        const anonymousUid = currentUser.uid;
        const result = await signInWithCredential(auth, credential);
        return {
          user: result.user,
          wasAnonymous: true,
          conflictAnonymousUid: anonymousUid,
        };
      }
      throw err; // Re-throw other errors (invalid code, expired, etc.)
    }
  }

  // ── No anonymous user (edge case) → plain sign-in ──
  const result = await signInWithCredential(auth, credential);
  return { user: result.user, wasAnonymous: false };
}

/**
 * Tear down any existing reCAPTCHA verifier and clean up DOM artifacts.
 * Call on component unmount to prevent leaked widgets.
 */
export function clearRecaptchaVerifier(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // Ignore
    }
    recaptchaVerifier = null;
  }
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  clearRecaptchaVerifier();
  await firebaseSignOut(auth);
}
