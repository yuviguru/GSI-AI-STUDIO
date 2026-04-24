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
import { auth, signOutUser, isFirebaseConfigured } from '@/lib/firebase/client';
import type { UserRole, UserPlan } from '@/types/user.types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserProfile {
  uid: string;
  phoneNumber: string | null;
  displayName: string | null;
  // Fetched from Firestore user doc after auth
  role?: UserRole;
  plan?: UserPlan;
  name?: string;
  kidIds?: string[];
}

interface AuthState {
  /** The authenticated user, or null if anonymous */
  user: UserProfile | null;
  /** True while Firebase Auth is initializing */
  loading: boolean;
  /** True if user is authenticated */
  isAuthenticated: boolean;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Firebase ID token for API calls */
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

  // Listen for Firebase Auth state changes
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
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Build initial profile from Firebase Auth data
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
  }, []);

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
    isAuthenticated: !!firebaseUser,
    signOut: handleSignOut,
    getIdToken,
    error,
    refreshProfile,
  };

  // Use createElement to avoid JSX in .ts file
  const { createElement } = require('react');
  return createElement(AuthContext.Provider, { value }, children);
}
