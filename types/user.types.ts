/** User types matching Firestore schema */

import type { DecodedIdToken } from 'firebase-admin/auth';

export type UserRole = 'parent' | 'teacher' | 'admin';
export type UserPlan = 'free' | 'creator' | 'family';

export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  plan: UserPlan;
  planExpiresAt?: Date;
  schoolId?: string;
  kidIds?: string[];
  preferences?: {
    language: string;
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  createdAt: Date;
  updatedAt: Date;
}

/** Firestore document shape (server-side, with Timestamps) */
export interface UserDoc {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  plan: UserPlan;
  planExpiresAt?: FirebaseFirestore.Timestamp;
  schoolId?: string;
  kidIds?: string[];
  preferences?: {
    language: string;
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/** Auth context for client-side consumption */
export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthUser {
  uid: string;
  phoneNumber: string | null;
  displayName: string | null;
}

/** Hybrid auth result — supports anonymous sessions and authenticated users */
export type HybridAuthResult =
  | { type: 'anonymous'; sessionId: string }
  | { type: 'authenticated'; user: DecodedIdToken };

/** Registration request body */
export interface RegisterRequest {
  name: string;
  email?: string;
  role?: UserRole;
}

/** Claim session request body */
export interface ClaimSessionRequest {
  sessionId: string;
}

/** Claim session response */
export interface ClaimSessionResponse {
  claimedCount: number;
  pointsMigrated: number;
  badgesMigrated: string[];
}

export interface KidProfile {
  id: string;
  name: string;
  age: number;
  grade: string;
  board?: 'cbse' | 'icse' | 'state';
  avatar?: string;
  totalCreations: number;
  aiPoints: number;
  streak?: {
    current: number;
    longest: number;
    lastActiveDate: string;
  };
  learningProgress?: Record<string, number>;
  badges: string[];
  createdAt: Date;
}

export interface Session {
  id: string;
  fingerprint?: string;
  creationCount: number;
  lastCreationAt?: Date;
  ipHash?: string;
  createdAt: Date;
  expiresAt: Date;
  // Phase 1.5 — AI Points & Badges
  aiPoints?: number;
  badges?: string[];
  conceptsLearned?: string[];
  creationsByType?: Record<string, number>;
  shareCount?: number;
}
