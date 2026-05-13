'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signOutUser, ensureAnonymousAuth, isFirebaseConfigured } from '@/lib/firebase/client';
import type { UserRole, UserPlan } from '@gsi/types';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Summary of pending anonymous-session data awaiting assignment to a kid. */
export interface ClaimedSessionSummary {
  aiPoints: number;
  badgeCount: number;
  conceptCount: number;
  creationTypes: string[];
  totalCreationCount: number;
  onboarding?: {
    name?: string;
    avatarUrl?: string;
    mascotId?: string;
  };
}

interface UserProfile {
  uid: string;
  phoneNumber: string | null;
  displayName: string | null;
  // Fetched from Firestore user doc after auth
  role?: UserRole;
  plan?: UserPlan;
  name?: string;
  kidIds?: string[];
  /** Non-null when there's pending anonymous session data to assign to a kid. */
  claimedSessionSummary?: ClaimedSessionSummary;
}

interface AuthState {
  /** The authenticated user, or null if anonymous */
  user: UserProfile | null;
  /** True while Firebase Auth is initializing (includes anonymous auth setup) */
  loading: boolean;
  /** True if user has a real identity (phone auth). False for anonymous. */
  isAuthenticated: boolean;
  /** True if user has Firebase Anonymous Auth (no phone yet). */
  isAnonymous: boolean;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Firebase ID token for API calls (works for anonymous users too) */
  getIdToken: () => Promise<string | null>;
  /** Error from auth operations */
  error: string | null;
  /** Fetch and cache the user profile from Firestore via API */
  refreshProfile: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  isAuthenticated: false,
  isAnonymous: false,
  signOut: async () => {},
  getIdToken: async () => null,
  error: null,
  refreshProfile: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for Firebase Auth state changes.
  // If no user exists, auto-sign-in anonymously so every visitor gets a
  // stable Firebase UID from day one. When they later sign up with phone,
  // `linkWithCredential` upgrades the account in-place (same UID, zero
  // migration for the happy path).
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setFirebaseUser(null);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);

      if (!user) {
        // No user yet — kick off anonymous auth. This will trigger another
        // onAuthStateChanged with the anonymous user, which hits the branch
        // below. We intentionally leave `loading = true` until that fires.
        setUserProfile(null);
        ensureAnonymousAuth().catch(() => {
          // Anonymous auth failed (network, Firebase down, demo mode).
          // Fall back to truly anonymous — loading can finish.
          setLoading(false);
        });
        return;
      }

      // We have a Firebase user (anonymous or phone-authenticated).
      // For anonymous users: just set loading false, no Firestore profile.
      // For phone users: build a profile object for the rest of the app.
      if (user.isAnonymous) {
        setUserProfile(null); // No Firestore profile for anonymous users
        setLoading(false);
        return;
      }

      // Phone-authenticated user — build initial profile from Firebase data
      setUserProfile({
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
      });
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Fetch user profile from API when Firebase user changes
  useEffect(() => {
    if (!firebaseUser) return;

    let cancelled = false;

    async function fetchProfile() {
      try {
        const token = await firebaseUser!.getIdToken();
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.success) {
            setUserProfile((prev) => ({
              ...prev!,
              name: json.data.name,
              role: json.data.role,
              plan: json.data.plan,
              kidIds: json.data.kidIds,
              claimedSessionSummary: json.data.claimedSessionSummary,
            }));
          }
        }
        // 404 is expected for newly registered users who haven't called /register yet
      } catch {
        // Non-blocking — profile data is optional
      }
    }

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  const handleSignOut = useCallback(async () => {
    try {
      setError(null);

      // Best-effort server cleanup BEFORE we lose the auth token. If this
      // fails (network, server cold start) we still proceed with sign-out —
      // the orphan snapshot is recoverable on next sign-in.
      try {
        const token = firebaseUser ? await firebaseUser.getIdToken() : null;
        if (token) {
          await fetch('/api/auth/signout-cleanup', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            // Don't block UI if the network is slow.
            signal: AbortSignal.timeout(2000),
          }).catch(() => {});
        }
      } catch {
        // Non-blocking — proceed with sign-out
      }

      await signOutUser();
      setUserProfile(null);
      // Hard reset: clear all gsi-* localStorage + sessionStorage keys so the
      // next session starts from a clean slate (points, badges, active kid,
      // x-ray flags, streaks, etc.). A full reload then reinitializes every
      // context provider from scratch.
      //
      // Navigate FIRST so that in-flight React effects don't fire with a
      // missing session ID and accidentally create orphan Firestore docs.
      // The browser will tear down the current page once navigation begins;
      // we clear storage in a beforeunload-safe sync block right after.
      if (typeof window !== 'undefined') {
        // Redirect immediately — stops React effects from running with
        // empty localStorage while the page is still alive.
        window.location.href = '/';

        // These run synchronously before the browser actually navigates,
        // ensuring the next page load starts clean.
        const lsKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('gsi-')) lsKeys.push(key);
        }
        lsKeys.forEach((k) => localStorage.removeItem(k));

        const ssKeys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('gsi-')) ssKeys.push(key);
        }
        ssKeys.forEach((k) => sessionStorage.removeItem(k));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
    }
  }, [firebaseUser]);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!firebaseUser) return null;
    try {
      return await firebaseUser.getIdToken();
    } catch {
      return null;
    }
  }, [firebaseUser]);

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setUserProfile((prev) => ({
            ...prev!,
            name: json.data.name,
            role: json.data.role,
            plan: json.data.plan,
            kidIds: json.data.kidIds,
            claimedSessionSummary: json.data.claimedSessionSummary,
          }));
        }
      }
    } catch {
      // Non-blocking
    }
  }, [firebaseUser]);

  const value: AuthState = {
    user: userProfile,
    loading,
    // isAuthenticated = true ONLY for phone-verified users, not anonymous.
    // This preserves existing behavior for all 56+ files that check it.
    isAuthenticated: !!firebaseUser && !firebaseUser.isAnonymous,
    isAnonymous: !!firebaseUser?.isAnonymous,
    signOut: handleSignOut,
    getIdToken,
    error,
    refreshProfile,
  };

  // Use createElement to avoid JSX in .ts file
  const { createElement } = require('react');
  return createElement(AuthContext.Provider, { value }, children);
}
