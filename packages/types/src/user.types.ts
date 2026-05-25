/** User types matching Firestore schema */

import type { CreationType } from './creation.types';

// ─── Roles & Plans ─────────────────────────────────────────────────────────

export type UserRole = 'parent' | 'teacher' | 'schoolAdmin';
/**
 * Unified plan enum. Source of truth lives in `lib/billing/plans.ts`;
 * this type mirrors the IDs so packages outside `lib/` can type-check.
 *
 * Reconciled from a stale `'free' | 'creator' | 'family'` — `family` was
 * never consumed by any code path. Renamed to `pro` to match the marketing
 * tiers and `lib/rateLimits.ts`.
 */
export type UserPlan = 'free' | 'creator' | 'pro' | 'school' | 'admin';

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
  avatar?: string; // Legacy emoji-avatar id (e.g. "tiger") from old picker
  /** AI-buddy chosen during onboarding (e.g. "koko", "pixie"). Roster in lib/mascots/roster.ts */
  mascotId?: string;
  /** AI-generated avatar URL (Firebase Storage) created during onboarding */
  avatarUrl?: string;

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
  /** Per-studio daily activity streaks. Mirrored from the session doc on
   *  each `track_creation`. Absent on kid docs that predate the feature. */
  perStudioStreaks?: Record<string, { count: number; lastDay: string }>;

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

  // ─── Billing (BILLING-001) ───────────────────────────────────────────────
  /** Effective plan for this kid. Inherited from parent/school; cached here
   *  for fast guard checks. `lib/billing/guard.ts` reads this. Absent = free. */
  plan?: UserPlan;
  /** Denormalized credit balance. Authoritative ledger is the
   *  `kids/{kidId}/creditLedger` subcollection. Absent = 0. */
  creditBalance?: number;
  /** Size of the most recent monthly grant. Used by the renewal job to know
   *  what to re-grant on `creditsMonthlyResetAt`. Mirrors PLANS[plan].creditsPerMonth. */
  creditsMonthlyGrantAmount?: number;
  /** When the current monthly grant landed. */
  creditsMonthlyGrantedAt?: Date;
  /** When the next monthly grant should fire. Typically grant + 30d. */
  creditsMonthlyResetAt?: Date;
  /** Telemetry — when the last successful AI debit happened. */
  creditsLastDebitAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Append-only ledger entry. Subcollection: `kids/{kidId}/creditLedger`.
 * Source of truth for credit balance. `KidProfile.creditBalance` is a cache.
 */
export interface CreditLedgerEntry {
  id: string;
  /** What kind of credit movement this is. */
  type: 'grant' | 'topup' | 'debit' | 'refund' | 'expire' | 'bonus';
  /** Credit delta. Positive for grant/topup/refund/bonus, negative for debit/expire. */
  amount: number;
  /** Cached `creditBalance` after this entry — drift detector. */
  balanceAfter: number;
  /** For `debit`: feature key from CREDIT_COSTS (e.g. `story.generate`). */
  feature?: string;
  /** For `topup`/`refund`: Razorpay payment or order ID. Idempotency key. */
  paymentRef?: string;
  paymentProvider?: 'razorpay' | 'stripe' | 'manual';
  /** For `grant`: when the grant expires (carries the monthly reset date). */
  expiresAt?: Date;
  /** Free-form analytics blob: `{ plan, sessionId, creationId, model, tokens }`. */
  metadata?: Record<string, unknown>;
  /** If this entry was later refunded, the ID of the refund entry. */
  reversedBy?: string;
  createdAt: Date;
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

// ─── Schools, Classes, Assignments, Submissions (Phase 3) ──────────────────

export type Board = 'cbse' | 'icse' | 'state';

/** Phase 4 (ADMIN-009): white-label branding applied to all exported PDFs. */
export interface SchoolBranding {
  logoUrl?: string;
  letterheadUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export type SchoolPlan = 'trial' | 'basic' | 'premium';

export interface SchoolDoc {
  id: string;
  name: string;
  city: string;
  state: string;
  board: Board;
  /** Short human-readable code used during teacher registration */
  schoolCode: string;
  /** Primary admin (teacher/principal) user ID */
  adminUid: string;
  teacherIds: string[];
  studentCount: number;
  plan: SchoolPlan;
  /** Phase 4 (ADMIN-009): optional branding for PDF exports. */
  branding?: SchoolBranding;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassDoc {
  id: string;
  schoolId: string;
  name: string;
  grade: string;
  section?: string;
  teacherUid: string;
  studentKidIds: string[];
  /** 6-char alphanumeric invite code (unique per class) */
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AssignmentStatus = 'active' | 'closed';

export interface AssignmentDoc {
  id: string;
  schoolId: string;
  classId: string;
  teacherUid: string;
  title: string;
  description: string;
  creationType: CreationType;
  dueDate: Date;
  curriculumTags: string[];
  templateId?: string;
  status: AssignmentStatus;
  submissions: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SubmissionStatus = 'pending' | 'approved' | 'revision_requested';

export interface SubmissionDoc {
  id: string;
  assignmentId: string;
  classId: string;
  schoolId: string;
  kidId: string;
  creationId: string;
  status: SubmissionStatus;
  feedback?: string;
  starred?: boolean;
  /** Phase 4 (ENGAGE-008): teacher opt-in to surface this approved
   *  creation in the class feed. Default false. */
  sharedToClassFeed?: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── School analytics (cached aggregate — Phase 3) ────────────────────────

export interface SchoolAnalyticsDoc {
  schoolId: string;
  totalStudents: number;
  activeStudentsThisWeek: number;
  totalCreations: number;
  creationsThisWeek: number;
  creationsByType: Record<CreationType, number>;
  curriculumCoverage: Array<{
    conceptId: string;
    conceptName: string;
    studentsExposed: number;
    percentage: number;
  }>;
  teacherActivity: Array<{
    teacherUid: string;
    teacherName: string;
    classes: number;
    assignmentsCreated: number;
    avgCompletionRate: number;
    lastActiveAt?: Date;
  }>;
  weeklyTrend: Array<{ week: string; creations: number; students: number }>;
  updatedAt: Date;
}

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
