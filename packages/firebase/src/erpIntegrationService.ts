/**
 * Phase 4 (INTEGRATION-001): persistence helpers for the ERP integration
 * config. Credential storage is stubbed for Sprint 1-2 — we only persist a
 * `credentialsRef` placeholder; the full KMS-backed encryption lands with
 * the Fedena adapter rollout.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import type {
  ErpIntegrationConfig,
  SchoolDataProviderId,
} from '@/lib/integrations/schoolDataProvider';

const COLLECTION = 'erpIntegrations';

const SUPPORTED: SchoolDataProviderId[] = [
  'local',
  'fedena',
  'mastersoft',
  'schoollog',
  'neverskip',
];

export interface SaveIntegrationInput {
  schoolId: string;
  provider: SchoolDataProviderId;
  credentialsRef?: string;
  enabled?: boolean;
}

// `credentialsRef` is a stub until the KMS adapter lands. It must match
// a bounded-charset opaque reference pattern (letters, digits, and a
// limited set of structural characters) and be <= 256 chars so a
// compromised admin can't inject path-traversal-style references into
// a future KMS lookup.
const CREDENTIALS_REF_RE = /^[A-Za-z0-9_\-./:]{1,256}$/;

export async function saveErpIntegration(
  input: SaveIntegrationInput,
): Promise<ErpIntegrationConfig> {
  if (!SUPPORTED.includes(input.provider)) {
    throw new AppException('INVALID_INPUT', `Unsupported provider: ${input.provider}`, 400);
  }
  if (
    input.credentialsRef !== undefined &&
    input.credentialsRef !== '' &&
    !CREDENTIALS_REF_RE.test(input.credentialsRef)
  ) {
    throw new AppException(
      'INVALID_INPUT',
      'credentialsRef must be ≤256 chars, letters/digits/._-/: only.',
      400,
    );
  }
  const ref = adminDb.collection(COLLECTION).doc(input.schoolId);
  const payload = {
    schoolId: input.schoolId,
    provider: input.provider,
    credentialsRef: input.credentialsRef ?? null,
    enabled: input.enabled ?? true,
    updatedAt: Timestamp.now(),
  };
  await ref.set(payload, { merge: true });
  const doc = await ref.get();
  const data = doc.data() as Record<string, unknown>;
  return {
    schoolId: input.schoolId,
    provider: data.provider as SchoolDataProviderId,
    credentialsRef: (data.credentialsRef as string | undefined) ?? undefined,
    lastSyncAt: (data.lastSyncAt as { toDate?: () => Date } | undefined)?.toDate?.(),
    lastSyncStatus: data.lastSyncStatus as 'success' | 'failure' | undefined,
    lastError: data.lastError as string | undefined,
    enabled: (data.enabled as boolean) ?? true,
  };
}

export async function removeErpIntegration(schoolId: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(schoolId).delete();
}

export async function recordSyncOutcome(
  schoolId: string,
  outcome: 'success' | 'failure',
  error?: string,
): Promise<void> {
  await adminDb.collection(COLLECTION).doc(schoolId).set(
    {
      lastSyncAt: Timestamp.now(),
      lastSyncStatus: outcome,
      lastError: error ?? null,
    },
    { merge: true },
  );
}
