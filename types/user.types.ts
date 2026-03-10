/** User types matching Firestore schema */

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
  preferences?: {
    language: string;
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  createdAt: Date;
  updatedAt: Date;
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
