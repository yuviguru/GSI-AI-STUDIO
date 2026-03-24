/** User types matching Firestore schema */

// ─── Roles & Plans ─────────────────────────────────────────────────────────

export type UserRole = 'parent' | 'teacher';
export type UserPlan = 'free' | 'creator' | 'family';

// ─── Users (parents & teachers) ────────────────────────────────────────────

export interface UserDoc {
  id: string; // Firebase Auth UID (phone-based)
  phone: string; // +91XXXXXXXXXX
  name?: string; // Optional — parent name not collected during signup
  email?: string;
  role: UserRole;
  plan: UserPlan;
  planExpiresAt?: Date;
  kidIds: string[]; // Kid Firebase UIDs or auto-IDs (max 4 for parents)
  schoolId?: string; // For teachers: assigned school
  consentedAt: Date; // When parent confirmed 18+ and agreed to T&C
  preferences?: {
    language: 'en' | 'hi';
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  claimedSessionIds?: string[]; // Migrated anonymous sessions
  createdAt: Date;
  updatedAt: Date;
}

// ─── Kids (top-level collection) ───────────────────────────────────────────

export interface KidProfile {
  id: string; // Firebase Auth UID (Google) or auto-generated
  email: string; // Kid's email — identifier for the profile
  googleEmail?: string; // Only if kid signed in with Google
  name: string; // Display name (can be fictional per DPDPA)
  avatar?: string; // Avatar ID from picker

  // DPDPA verification
  verifiedBy: 'parent' | 'teacher' | null;
  verifiedAt?: Date;
  verificationDeadline?: Date; // 30 days from creation if unverified

  // Demographics (only collected after verification)
  age?: number; // 8-17
  grade?: string; // "3" - "12"
  board?: 'cbse' | 'icse' | 'state';

  // Relationships (additive — both can be set)
  parentId: string | null; // Parent's Firebase UID
  schoolId: string | null; // School ID (set via class code)
  classIds: string[]; // Classes the kid belongs to

  // Progress (single source of truth — shared across all contexts)
  aiPoints: number;
  badges: string[];
  conceptsLearned: string[];
  creationsByType: Record<string, number>;
  shareCount: number;
  totalCreations: number;
  streak: {
    current: number;
    longest: number;
    lastActiveDate: string; // YYYY-MM-DD
  };

  // Game progress
  beatTheAiSkills?: Record<string, { xp: number; level: number }>;
  beatTheAiStats?: {
    totalRounds: number;
    wins: number;
    losses: number;
    ties: number;
    currentStreak: number;
    longestStreak: number;
    byCategory: Record<string, { rounds: number; wins: number }>;
  };
  skillArenaProgress?: Record<
    string,
    { band: number; score: number; assessments: number }
  >;
  skillArenaStats?: { totalAssessments: number; averageBand: number };

  claimedSessionId?: string; // Migrated anonymous session
  createdAt: Date;
  updatedAt: Date;
}

// ─── Auth context (returned by verifyAuth / hybridAuth) ────────────────────

export interface AuthContext {
  userId: string;
  role: UserRole;
  kidId?: string; // Active kid (for parent-managed mode)
  schoolId?: string;
  plan: UserPlan;
}

export type HybridAuthResult =
  | { type: 'anonymous'; sessionId: string }
  | { type: 'authenticated'; auth: AuthContext };

// ─── Session (Phase 1 anonymous) ───────────────────────────────────────────

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
