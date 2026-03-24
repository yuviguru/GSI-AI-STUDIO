'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, signOutUser, initAuthPersistence } from '@/lib/firebase/client';
import type { AuthState, AuthUser } from '@/types/user.types';
import React from 'react';

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function firebaseUserToAuthUser(user: FirebaseUser): AuthUser {
  return {
    uid: user.uid,
    phoneNumber: user.phoneNumber,
    displayName: user.displayName,
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
    error: null,
  });

  useEffect(() => {
    // Set persistence before listening
    initAuthPersistence().catch(() => {
      // Non-blocking — persistence defaults are fine
    });

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          setState({
            user: firebaseUserToAuthUser(firebaseUser),
            loading: false,
            isAuthenticated: true,
            error: null,
          });
        } else {
          setState({
            user: null,
            loading: false,
            isAuthenticated: false,
            error: null,
          });
        }
      },
      (error) => {
        setState({
          user: null,
          loading: false,
          isAuthenticated: false,
          error: error.message,
        });
      }
    );

    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutUser();
      setState({
        user: null,
        loading: false,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Sign out failed',
      }));
    }
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    try {
      return await currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    signOut,
    getIdToken,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

/**
 * Access auth state from any client component.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
