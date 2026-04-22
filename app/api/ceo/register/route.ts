import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { requireAuthWithKid } from '@/lib/auth-utils';
import { ceoRegisterSchema } from '@/lib/validators';
import { filterInput } from '@/lib/safety/inputFilter';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  createCeoBusiness,
  getOrCreateCeoProfile,
  saveCeoEvent,
} from '@/lib/firebase/ceoService';
import { generateEvent } from '@/lib/ceo/eventEngine';
import { pickNextMilestone } from '@/lib/ceo/phases';

const CEO_BUSINESS_COLLECTION = 'ceoBusiness';
const REGISTRATIONS_PER_DAY_LIMIT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Kids can juggle up to 3 simultaneous active (non-completed) businesses.
 *  Beyond that the landing-page UI gets noisy and the LLM-event queue thrashes.
 *  A completed business frees up a slot, so finishing one lets the kid start
 *  a fresh one. */
const MAX_CONCURRENT_ACTIVE_BUSINESSES = 3;

/**
 * POST /api/ceo/register
 * Create a new Kid CEO business + seed the first milestone-steered event.
 *
 * Requires Firebase Auth (Authorization: Bearer) + an active kid profile
 * (X-Active-Kid-Id header). The kid must be owned by the authed user.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, kidId } = await requireAuthWithKid(request);

    const body = await request.json();
    const input = ceoRegisterSchema.parse(body);

    if (input.businessName) filterInput(input.businessName);
    if (input.customBusinessDescription) filterInput(input.customBusinessDescription);
    filterInput(input.location);

    await checkRegistrationRateLimit(kidId);
    await checkConcurrentActiveLimit(kidId);

    const business = await createCeoBusiness({
      userId,
      kidId,
      businessType: input.businessType,
      businessName: input.businessName,
      customBusinessDescription: input.customBusinessDescription ?? null,
      location: input.location,
      pace: input.pace,
    });

    await getOrCreateCeoProfile({
      userId,
      kidId,
      businessId: business.id,
    });

    const firstMilestone = pickNextMilestone(business.phase, business.phaseMilestones);
    const generated = await generateEvent({ business, milestone: firstMilestone });
    const firstEvent = await saveCeoEvent({ ...generated, deliveredVia: 'web' });

    return apiSuccess({ businessId: business.id, business, firstEvent }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Per-kid registration rate limit: max 3 new businesses per 24 hours. */
async function checkRegistrationRateLimit(kidId: string): Promise<void> {
  const cutoff = Timestamp.fromMillis(Date.now() - DAY_MS);
  const snapshot = await adminDb
    .collection(CEO_BUSINESS_COLLECTION)
    .where('kidId', '==', kidId)
    .where('createdAt', '>', cutoff)
    .count()
    .get();

  if (snapshot.data().count >= REGISTRATIONS_PER_DAY_LIMIT) {
    throw new AppException(
      'RATE_LIMITED',
      `You can register up to ${REGISTRATIONS_PER_DAY_LIMIT} businesses per day. Come back tomorrow!`,
      429,
    );
  }
}

/** Cap simultaneous active businesses per kid. */
async function checkConcurrentActiveLimit(kidId: string): Promise<void> {
  const snapshot = await adminDb
    .collection(CEO_BUSINESS_COLLECTION)
    .where('kidId', '==', kidId)
    .where('status', '==', 'active')
    .count()
    .get();

  if (snapshot.data().count >= MAX_CONCURRENT_ACTIVE_BUSINESSES) {
    throw new AppException(
      'TOO_MANY_ACTIVE_BUSINESSES',
      `You already have ${MAX_CONCURRENT_ACTIVE_BUSINESSES} active businesses running. Finish or pause one before starting a new one.`,
      400,
    );
  }
}
