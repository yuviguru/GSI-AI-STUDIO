/**
 * User repository — backend-neutral business logic for parent users.
 *
 * Migration status:
 *   ✅ Migrated to ports: createUser, getUser, clearOrphanedClaimSnapshot
 *   ⏳ Still in legacy lib/firebase/userService.ts: claimSession (complex
 *      multi-collection transaction with FieldValue.arrayUnion + batched
 *      writes — depends on additional port primitives that exist now but
 *      need careful refactoring to avoid regressions in the auth flow).
 *
 * As callers move over, the legacy file becomes a re-export shim like
 * creationService.ts.
 */

import { backend } from '@/lib/backend';
import { hashPhoneNumber } from '@/lib/channels/whatsapp/phoneHash';
import type { UserRole, UserPlan } from '@gsi/types';

const USERS = 'users';

export interface UserDoc {
  id: string;
  /** SHA-256(phone || PEPPER) for index/lookup. Never the raw number. */
  phoneHash: string;
  /**
   * Last 4 digits of the phone for UI display ("...3456").
   * Acceptable PII risk vs. full number; lets the parent recognize their
   * own account without exposing a contactable identifier.
   */
  phoneSuffix: string;
  name?: string;
  email?: string;
  role: UserRole;
  plan: UserPlan;
  planExpiresAt?: string;
  kidIds: string[];
  schoolId?: string;
  consentedAt: string;
  preferences?: {
    language: 'en' | 'hi';
    notifications: boolean;
    theme: 'light' | 'dark';
  };
  claimedSessionIds?: string[];
  claimedSessionData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  uid: string;
  phone: string;
  role: UserRole;
}

/** Create a user doc on first phone-auth registration. Idempotent — returns
 *  the existing doc if one is already present at the same uid.
 *
 *  PII handling: the raw `phone` from Firebase Auth is hashed via
 *  `hashPhoneNumber` and stored ONLY as `phoneHash`. We persist the last 4
 *  digits separately as a UI cue — Firebase Auth itself owns the canonical
 *  phone number and is the one source of truth. */
export async function createUser(input: CreateUserInput): Promise<UserDoc> {
  const existing = await backend.data.get<UserDoc>(USERS, input.uid);
  if (existing) return existing;

  const now = new Date().toISOString();
  const digits = input.phone.replace(/\D+/g, '');
  const doc: UserDoc = {
    id: input.uid,
    phoneHash: hashPhoneNumber(input.phone),
    phoneSuffix: digits.slice(-4),
    role: input.role,
    plan: 'free',
    kidIds: [],
    consentedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await backend.data.create<UserDoc>(USERS, input.uid, doc);
  return doc;
}

/** Look up a user by Firebase UID. */
export async function getUser(uid: string): Promise<UserDoc | null> {
  return backend.data.get<UserDoc>(USERS, uid);
}

/**
 * Clear `claimedSessionData` if no kid has consumed it yet.
 * Server-side hook for sign-out so a stale anonymous-session points
 * snapshot doesn't seed a future kid by mistake.
 */
export async function clearOrphanedClaimSnapshot(uid: string): Promise<void> {
  const user = await backend.data.get<UserDoc>(USERS, uid);
  if (!user) return;
  if (!user.claimedSessionData) return;
  if ((user.kidIds ?? []).length > 0) return;
  await backend.data.deleteField(USERS, uid, 'claimedSessionData');
}
