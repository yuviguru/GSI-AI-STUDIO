/** User types matching Firestore schema */

import type { CreationType } from './creation.types';

// ─── Roles & Plans ─────────────────────────────────────────────────────────

export type UserRole = 'parent' | 'teacher' | 'schoolAdmin';
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
