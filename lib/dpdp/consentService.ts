/**
 * Phase 4 (COMPLIANCE-002): parent consent persistence + enforcement.
 *
 * Every AI generator and every parent-messaging flow calls `hasConsent`
 * before acting. Revocations append a new `granted: false` record — we
 * never mutate the audit log, so a full history is always queryable.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppException } from '@/lib/api-utils';
import {
  ALL_CONSENT_SCOPES,
  type ConsentMethod,
  type ConsentRecord,
  type ConsentScope,
  type ConsentState,
} from '@gsi/types';

const CONSENT_LOG_COLLECTION = 'consentLog';
const KIDS_COLLECTION = 'kids';

interface ConsentLogFirestore {
  id: string;
  parentUid: string;
  kidId: string;
  scope: ConsentScope;
  granted: boolean;
  method: ConsentMethod;
  ip?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

function toRecord(doc: ConsentLogFirestore): ConsentRecord {
  return {
    ...doc,
    timestamp: doc.timestamp.toDate(),
  };
}

function isScope(v: unknown): v is ConsentScope {
  return (
    typeof v === 'string' &&
    (ALL_CONSENT_SCOPES as string[]).includes(v)
  );
}

async function assertKidBelongsToParent(
  parentUid: string,
  kidId: string,
): Promise<void> {
  const kidSnap = await adminDb.collection(KIDS_COLLECTION).doc(kidId).get();
  if (!kidSnap.exists) {
    throw new AppException('NOT_FOUND', 'Kid not found.', 404);
  }
  const parentId = kidSnap.data()?.parentId as string | null | undefined;
  if (!parentId || parentId !== parentUid) {
    throw new AppException('FORBIDDEN', 'Kid is not linked to you.', 403);
  }
}

export interface RecordConsentInput {
  parentUid: string;
  kidId: string;
  scope: ConsentScope;
  granted: boolean;
  method: ConsentMethod;
  ip?: string;
  userAgent?: string;
}

/**
 * Append a consent decision to the audit log. This mutates `kids.{id}.consent`
 * with the current per-scope booleans for fast reads, while the immutable
 * trail stays in `consentLog`.
 */
export async function recordConsent(input: RecordConsentInput): Promise<ConsentRecord> {
  if (!isScope(input.scope)) {
    throw new AppException('INVALID_INPUT', `Unknown scope: ${input.scope}`, 400);
  }
  await assertKidBelongsToParent(input.parentUid, input.kidId);

  const now = Timestamp.now();
  const ref = adminDb.collection(CONSENT_LOG_COLLECTION).doc();
  const doc: ConsentLogFirestore = {
    id: ref.id,
    parentUid: input.parentUid,
    kidId: input.kidId,
    scope: input.scope,
    granted: input.granted,
    method: input.method,
    ip: input.ip,
    userAgent: input.userAgent,
    timestamp: now,
  };

  const kidRef = adminDb.collection(KIDS_COLLECTION).doc(input.kidId);
  const batch = adminDb.batch();
  batch.set(ref, doc);
  batch.set(
    kidRef,
    {
      consent: { [input.scope]: input.granted },
      updatedAt: now,
    },
    { merge: true },
  );
  await batch.commit();

  return toRecord(doc);
}

/**
 * Convenience — record an explicit revocation.
 */
export async function revokeConsent(input: {
  parentUid: string;
  kidId: string;
  scope: ConsentScope;
  ip?: string;
  userAgent?: string;
}): Promise<ConsentRecord> {
  return recordConsent({
    ...input,
    granted: false,
    method: 'revocation',
  });
}

/**
 * Quick per-scope check used by AI generators and messaging. Returns the
 * latest value from the kid doc's cached `consent` map (server-side
 * authoritative — writes flow through recordConsent only).
 */
export async function hasConsent(
  kidId: string,
  scope: ConsentScope,
): Promise<boolean> {
  const kidSnap = await adminDb.collection(KIDS_COLLECTION).doc(kidId).get();
  if (!kidSnap.exists) return false;
  const consent = kidSnap.data()?.consent as
    | Record<string, boolean>
    | undefined;
  return Boolean(consent?.[scope]);
}

/**
 * Throws FORBIDDEN_CONSENT (403) if the scope is not granted for the kid.
 * Use this at the top of AI-generator endpoints.
 */
export async function requireConsent(
  kidId: string,
  scope: ConsentScope,
): Promise<void> {
  const ok = await hasConsent(kidId, scope);
  if (!ok) {
    throw new AppException(
      'FORBIDDEN_CONSENT',
      `Parent consent for "${scope}" is required before this action.`,
      403,
    );
  }
}

/** Read the current per-scope consent state for a kid. */
export async function getConsentState(kidId: string): Promise<ConsentState> {
  const kidSnap = await adminDb.collection(KIDS_COLLECTION).doc(kidId).get();
  if (!kidSnap.exists) return {};
  const consent = kidSnap.data()?.consent as
    | Record<string, boolean>
    | undefined;
  if (!consent) return {};
  const state: ConsentState = {};
  for (const scope of ALL_CONSENT_SCOPES) {
    if (typeof consent[scope] === 'boolean') state[scope] = consent[scope];
  }
  return state;
}

/**
 * Full audit trail for a kid — used by the DPO view and compliance export.
 */
export async function getConsentAudit(kidId: string): Promise<ConsentRecord[]> {
  const snap = await adminDb
    .collection(CONSENT_LOG_COLLECTION)
    .where('kidId', '==', kidId)
    .orderBy('timestamp', 'desc')
    .get();
  return snap.docs.map((d) => toRecord(d.data() as ConsentLogFirestore));
}

/** Force-touch the kid's updatedAt (useful for revocation cascade hooks). */
export async function touchKid(kidId: string): Promise<void> {
  await adminDb
    .collection(KIDS_COLLECTION)
    .doc(kidId)
    .set({ updatedAt: Timestamp.now() }, { merge: true });
}

// Server-only use of FieldValue suppressed because we rely on explicit merges.
export const _internals = { FieldValue };
