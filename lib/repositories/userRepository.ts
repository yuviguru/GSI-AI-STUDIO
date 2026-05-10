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
import { backend as backendForArrayOps } from '@/lib/backend';
import type { UserRole, UserPlan } from '@/types/user.types';

const USERS = 'users';

export interface UserDoc {
  id: string;
  phone: string;
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
 *  the existing doc if one is already present at the same uid. */
export async function createUser(input: CreateUserInput): Promise<UserDoc> {
  const existing = await backend.data.get<UserDoc>(USERS, input.uid);
  if (existing) return existing;

  const now = new Date().toISOString();
  const doc: UserDoc = {
    id: input.uid,
    phone: input.phone,
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
  await backendForArrayOps.data.deleteField(USERS, uid, 'claimedSessionData');
}
