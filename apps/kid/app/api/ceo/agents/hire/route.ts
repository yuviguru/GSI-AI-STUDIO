import { NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoAgentHireSchema } from '@/lib/validators';
import { adminDb } from '@gsi/firebase/admin';
import { getCeoBusiness } from '@gsi/firebase/ceoService';
import {
  createCeoAgentHire,
  getActiveHireForAgent,
} from '@gsi/firebase/ceoAgentHireService';
import { getAgentDescriptor, isAgentUnlocked } from '@/lib/ceo/agents/catalog';
import type { CeoBusiness } from '@gsi/types';

/**
 * POST /api/ceo/agents/hire
 *
 * Hires an agent for a business. Validates unlock-phase, deducts the
 * first-day salary from `business.currentCash` atomically with the hire
 * write, and writes a `ceoAgentHires` doc.
 *
 * Auth: Firebase Bearer + X-Active-Kid-Id. Kid must own the business.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);
    const body = await request.json();
    const { businessId, agentId, config } = ceoAgentHireSchema.parse(body);

    const business = await getCeoBusiness(businessId);
    if (business.kidId !== kidId || business.userId !== userId) {
      throw new AppException('FORBIDDEN', 'Not your business', 403);
    }
    if (business.status !== 'active') {
      throw new AppException('BUSINESS_INACTIVE', 'Can only hire for active businesses', 400);
    }

    const descriptor = getAgentDescriptor(agentId);
    if (!isAgentUnlocked(descriptor, business.phase)) {
      throw new AppException(
        'AGENT_LOCKED',
        `${descriptor.name} unlocks at the ${descriptor.unlockPhase} phase — yours is ${business.phase}.`,
        400,
      );
    }

    // Focus must be one of the allowed options (Zod can't know the per-
    // agent list — we enforce it here).
    const validFocuses = descriptor.focusOptions.map((f) => f.id);
    if (!validFocuses.includes(config.focus)) {
      throw new AppException(
        'INVALID_FOCUS',
        `focus must be one of: ${validFocuses.join(', ')}`,
        400,
      );
    }

    // Duplicate check: one active hire per agent per business.
    const existing = await getActiveHireForAgent(businessId, agentId);
    if (existing) {
      throw new AppException(
        'ALREADY_HIRED',
        `${descriptor.name} is already on your team.`,
        400,
      );
    }

    // Cash check — fail fast before the write.
    if (business.currentCash < descriptor.salaryPerDay) {
      throw new AppException(
        'INSUFFICIENT_CASH',
        `You need at least ₹${descriptor.salaryPerDay} to hire ${descriptor.name}. You have ₹${business.currentCash}.`,
        400,
      );
    }

    // Atomic: deduct first-day salary + create hire doc.
    const hire = await adminDb.runTransaction(async (tx) => {
      const bizRef = adminDb.collection('ceoBusiness').doc(businessId);
      const snap = await tx.get(bizRef);
      if (!snap.exists) {
        throw new AppException('NOT_FOUND', 'Business not found', 404);
      }
      const current = snap.data() as CeoBusiness;
      const updatedCash = Math.max(0, (current.currentCash ?? 0) - descriptor.salaryPerDay);
      tx.update(bizRef, {
        currentCash: updatedCash,
        updatedAt: Timestamp.now(),
      });
      // createCeoAgentHire also writes — but it doesn't use the tx, so
      // do the write inline here.
      const ref = adminDb.collection('ceoAgentHires').doc();
      const now = Timestamp.now();
      const hireDoc = {
        id: ref.id,
        userId,
        kidId,
        businessId,
        agentId,
        config,
        salary: descriptor.salaryPerDay,
        status: 'active' as const,
        hiredAt: now,
        updatedAt: now,
      };
      tx.set(ref, hireDoc);
      return hireDoc;
    });

    // Re-read business to return fresh cash.
    const refreshed = await getCeoBusiness(businessId);
    return apiSuccess({ hire, business: refreshed }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// Export for tree-shaker friendliness; Next sees the POST above anyway.
export const dynamic = 'force-dynamic';
// Silence lint on unused import when bundler optimises:
void createCeoAgentHire;
