/**
 * Phase 4 (COMPLIANCE-001): aggregations the compliance v2 PDF needs.
 *
 * Pulls live counts off:
 *   - kids.consent (per-scope cached state)
 *   - teacherAiUsage (generator counts)
 *   - erasureRequests (status log)
 *
 * Kept in a separate service so the existing v1 compliance route can
 * stay untouched and the v2 PDF builder is pure presentation.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './admin';
import type { AiGenerator } from './teacherAiUsageService';
import type { ConsentScope, ErasureRequest } from '@gsi/types';
import { ALL_CONSENT_SCOPES } from '@gsi/types';

const KIDS = 'kids';
const AI_USAGE = 'teacherAiUsage';
const ERASURE = 'erasureRequests';

const ALL_GENERATORS: AiGenerator[] = [
  'hpc',
  'questionPaper',
  'feedback',
  'lessonPlan',
  'ptm',
  'digest',
  'adhoc',
  'subInstructions',
];

export async function getConsentSnapshotForSchool(
  schoolId: string,
): Promise<{
  kidsTotal: number;
  consentCounts: Partial<Record<ConsentScope, number>>;
}> {
  const snap = await adminDb.collection(KIDS).where('schoolId', '==', schoolId).get();
  const counts: Partial<Record<ConsentScope, number>> = {};
  for (const scope of ALL_CONSENT_SCOPES) counts[scope] = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const consent = (data.consent as Record<string, boolean> | undefined) ?? {};
    for (const scope of ALL_CONSENT_SCOPES) {
      if (consent[scope]) counts[scope] = (counts[scope] ?? 0) + 1;
    }
  }
  return { kidsTotal: snap.size, consentCounts: counts };
}

export async function getTeacherAiUsageRollup(
  schoolId: string,
): Promise<
  Array<{ generator: AiGenerator; last30Days: number; last12Months: number }>
> {
  const now = Date.now();
  const cutoff30 = now - 30 * 24 * 60 * 60 * 1000;
  const cutoff365 = now - 365 * 24 * 60 * 60 * 1000;

  const snap = await adminDb
    .collection(AI_USAGE)
    .where('schoolId', '==', schoolId)
    .get();

  const last30: Record<string, number> = {};
  const last365: Record<string, number> = {};
  for (const generator of ALL_GENERATORS) {
    last30[generator] = 0;
    last365[generator] = 0;
  }

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const generator = data.generator as AiGenerator | undefined;
    if (!generator || !ALL_GENERATORS.includes(generator)) continue;
    const ts = (data.timestamp as Timestamp | undefined)?.toDate?.()?.getTime();
    if (!ts) continue;
    if (ts >= cutoff365) last365[generator] = (last365[generator] ?? 0) + 1;
    if (ts >= cutoff30) last30[generator] = (last30[generator] ?? 0) + 1;
  }
  return ALL_GENERATORS.map((generator) => ({
    generator,
    last30Days: last30[generator] ?? 0,
    last12Months: last365[generator] ?? 0,
  }));
}

export async function listErasureRequestsForSchool(
  schoolId: string,
  limit = 30,
): Promise<
  Array<Pick<ErasureRequest, 'id' | 'status' | 'createdAt' | 'completedAt'>>
> {
  // erasureRequests aren't directly stamped with schoolId — derive via the
  // kid's schoolId after the fact (cheap on small schools; revisit at
  // scale).
  const snap = await adminDb
    .collection(ERASURE)
    .orderBy('createdAt', 'desc')
    .limit(limit * 4)
    .get();
  const out: Array<
    Pick<ErasureRequest, 'id' | 'status' | 'createdAt' | 'completedAt'>
  > = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const kidId = data.kidId as string | undefined;
    if (!kidId) continue;
    const kidSnap = await adminDb.collection(KIDS).doc(kidId).get();
    if (kidSnap.data()?.schoolId !== schoolId) continue;
    out.push({
      id: doc.id,
      status: data.status as ErasureRequest['status'],
      createdAt:
        (data.createdAt as Timestamp | undefined)?.toDate?.() ?? new Date(),
      completedAt: (data.completedAt as Timestamp | undefined)?.toDate?.(),
    });
    if (out.length >= limit) break;
  }
  return out;
}
