import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import { initialMilestones, nextPhase, isPhaseComplete } from '@/lib/ceo/phases';
import { STARTING_CAPITAL, BUSINESS_TYPE_DEFAULT_NAMES, DIMENSIONS } from '@/lib/ceo/constants';
import type {
  CeoBusiness,
  CeoEvent,
  CeoProfile,
  CeoBusinessType,
  CeoChoiceId,
  CeoDimensionData,
  CeoDimensionScores,
  CeoDeliveryChannel,
  CeoPace,
} from '@/types';

const CEO_BUSINESS_COLLECTION = 'ceoBusiness';
const CEO_EVENTS_COLLECTION = 'ceoEvents';
const CEO_PROFILES_COLLECTION = 'ceoProfiles';

/** Events expire after 72h — keeps the pending queue bounded so stale events
 *  don't linger forever if the kid never comes back to decide. */
const EVENT_TTL_MS = 72 * 60 * 60 * 1000;

/** Max collisions tolerated when minting a shareUrl slug. With 6 bytes
 *  (48 bits) of entropy, hitting even one collision is astronomically
 *  unlikely — but retry a few times just in case. */
const SHARE_URL_MAX_RETRIES = 3;

// ─── Helpers ─────────────────────────────────────────────────

/** Recursively strip `undefined` values from an object so Firestore never
 *  rejects the write. Mirrors creationService.stripUndefined. */
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) cleaned[key] = stripUndefined(value);
  }
  return cleaned as T;
}

/** Detect the specific Firestore error raised when a composite index is
 *  still being built after deploy. Surfaces as gRPC code 9
 *  (FAILED_PRECONDITION) with a "requires an index" details string that
 *  also contains the "currently building" substring while the build is
 *  in flight.
 *
 *  We use this to let the UI render an empty list instead of 500ing for
 *  the brief window between `firebase deploy` and the index finishing —
 *  otherwise every time we add a new composite the whole feature goes
 *  dark for minutes. Real "missing index" errors (index never created
 *  at all) still surface via the same path but are caught at dev time. */
function isIndexBuildingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: number; details?: string; message?: string };
  if (e.code !== 9) return false;
  const details = (e.details ?? e.message ?? '').toString();
  return /currently building|index is still building|index is building/i.test(details);
}

/** Seed all six dimensions at the neutral baseline (score 50, 0 decisions,
 *  stable trend). Matches the DNA Card "no-data" starting state. */
function seedDimensions(): Record<string, CeoDimensionData> {
  const out: Record<string, CeoDimensionData> = {};
  for (const dim of DIMENSIONS) {
    out[dim] = { score: 50, decisions: 0, trend: 'stable' };
  }
  return out;
}

/** Mint a short, URL-safe slug from 6 random bytes. base64url (48 bits of
 *  entropy → 8 chars) — short enough to share, long enough to not collide. */
function mintShareSlug(): string {
  return crypto.randomBytes(6).toString('base64url');
}

function docToCeoBusiness(doc: FirebaseFirestore.DocumentSnapshot): CeoBusiness {
  const data = doc.data()!;
  return {
    id: doc.id,
    userId: data.userId ?? '',
    kidId: data.kidId ?? '',
    businessName: data.businessName,
    businessType: data.businessType,
    customBusinessDescription: data.customBusinessDescription ?? null,
    location: data.location,
    startingCapital: data.startingCapital,
    currentCash: data.currentCash,
    reputation: data.reputation,
    morale: data.morale,
    employees: data.employees,
    phase: data.phase,
    phaseMilestones: data.phaseMilestones ?? {},
    totalDecisions: data.totalDecisions ?? 0,
    status: data.status,
    pace: data.pace,
    nextEventAt: data.nextEventAt ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    completedAt: data.completedAt ?? null,
  };
}

function docToCeoEvent(doc: FirebaseFirestore.DocumentSnapshot): CeoEvent {
  const data = doc.data()!;
  return {
    id: doc.id,
    businessId: data.businessId,
    userId: data.userId ?? '',
    kidId: data.kidId ?? '',
    title: data.title,
    description: data.description,
    category: data.category,
    phase: data.phase,
    milestone: data.milestone ?? null,
    choices: data.choices ?? [],
    status: data.status,
    decidedChoice: data.decidedChoice ?? null,
    decisionTimestamp: data.decisionTimestamp ?? null,
    responseTimeSeconds: data.responseTimeSeconds ?? null,
    scores: data.scores ?? null,
    feedback: data.feedback ?? null,
    deliveredVia: data.deliveredVia ?? null,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
  };
}

function docToCeoProfile(doc: FirebaseFirestore.DocumentSnapshot): CeoProfile {
  const data = doc.data()!;
  return {
    id: doc.id,
    userId: data.userId ?? '',
    kidId: data.kidId ?? '',
    businessId: data.businessId,
    dimensions: data.dimensions ?? seedDimensions(),
    totalDecisions: data.totalDecisions ?? 0,
    avgResponseTime: data.avgResponseTime ?? 0,
    currentPhase: data.currentPhase ?? 'pre_launch',
    shareUrl: data.shareUrl ?? '',
    isPublic: data.isPublic ?? false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } as CeoProfile;
}

// ─── Businesses ──────────────────────────────────────────────

/** Create a new Kid CEO business for an authenticated user's kid profile.
 *  Seeds with default starting capital + initial flat milestone dict. Does
 *  NOT generate events (caller does that via eventEngine). */
export async function createCeoBusiness(params: {
  userId: string;
  kidId: string;
  businessType: CeoBusinessType;
  businessName?: string;
  customBusinessDescription?: string | null;
  location: string;
  pace: CeoPace;
}): Promise<CeoBusiness> {
  const docRef = adminDb.collection(CEO_BUSINESS_COLLECTION).doc();
  const id = docRef.id;
  const now = Timestamp.now();
  const startingCapital = STARTING_CAPITAL[params.businessType];
  const businessName =
    params.businessName?.trim() || BUSINESS_TYPE_DEFAULT_NAMES[params.businessType];

  const business: CeoBusiness = {
    id,
    userId: params.userId,
    kidId: params.kidId,
    businessName,
    businessType: params.businessType,
    customBusinessDescription: params.customBusinessDescription ?? null,
    location: params.location,
    startingCapital,
    currentCash: startingCapital,
    reputation: 50,
    morale: 50,
    employees: 0,
    phase: 'pre_launch',
    phaseMilestones: initialMilestones(),
    totalDecisions: 0,
    status: 'active',
    pace: params.pace,
    nextEventAt: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  await docRef.set(stripUndefined(business));
  return business;
}

/** Fetch a business by ID. Throws NOT_FOUND if missing. */
export async function getCeoBusiness(businessId: string): Promise<CeoBusiness> {
  const doc = await adminDb.collection(CEO_BUSINESS_COLLECTION).doc(businessId).get();
  if (!doc.exists) {
    throw new AppException('NOT_FOUND', 'Business not found', 404);
  }
  return docToCeoBusiness(doc);
}

/** Most recent active business for a kid profile. Returns null if the kid
 *  has no active business. Used by /api/ceo/business without businessId.
 *
 *  Treats "index still building" as "no businesses yet" so the UI stays
 *  friendly during the post-deploy index-build window. */
export async function getActiveBusinessForKid(
  kidId: string,
): Promise<CeoBusiness | null> {
  try {
    const snapshot = await adminDb
      .collection(CEO_BUSINESS_COLLECTION)
      .where('kidId', '==', kidId)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return docToCeoBusiness(snapshot.docs[0]!);
  } catch (err) {
    if (isIndexBuildingError(err)) {
      console.warn('[ceoService] getActiveBusinessForKid: index still building, returning null');
      return null;
    }
    throw err;
  }
}

/** List all businesses (active + completed) for a kid, newest first.
 *  Used by /api/ceo/businesses for the landing-page list.
 *
 *  Treats "index still building" as an empty list — see isIndexBuildingError. */
export async function listBusinessesForKid(
  kidId: string,
  limit: number = 20,
): Promise<CeoBusiness[]> {
  try {
    const snapshot = await adminDb
      .collection(CEO_BUSINESS_COLLECTION)
      .where('kidId', '==', kidId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(docToCeoBusiness);
  } catch (err) {
    if (isIndexBuildingError(err)) {
      console.warn('[ceoService] listBusinessesForKid: index still building, returning []');
      return [];
    }
    throw err;
  }
}

/** Replace the business state fields (currentCash, reputation, morale,
 *  employees, totalDecisions, phaseMilestones, phase, status, nextEventAt,
 *  completedAt). Also sets updatedAt = now. Used inside a transaction from
 *  the decide endpoint. */
export async function updateBusinessState(
  businessId: string,
  updates: Partial<CeoBusiness>,
): Promise<CeoBusiness> {
  const docRef = adminDb.collection(CEO_BUSINESS_COLLECTION).doc(businessId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new AppException('NOT_FOUND', 'Business not found', 404);
  }

  const { id: _id, userId: _uid, kidId: _kid, createdAt: _c, ...rest } = updates;
  const payload = stripUndefined({
    ...rest,
    updatedAt: Timestamp.now(),
  });

  await docRef.update(payload);
  const updated = await docRef.get();
  return docToCeoBusiness(updated);
}

/** Advance a business to the next phase. Sets phase = nextPhase and
 *  updatedAt = now. Returns the updated business. If already at 'mature'
 *  and phase is complete, sets status = 'completed' and completedAt = now. */
export async function advanceBusinessPhase(businessId: string): Promise<CeoBusiness> {
  const docRef = adminDb.collection(CEO_BUSINESS_COLLECTION).doc(businessId);

  const updated = await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) {
      throw new AppException('NOT_FOUND', 'Business not found', 404);
    }

    const business = docToCeoBusiness(doc);
    const now = Timestamp.now();
    const next = nextPhase(business.phase);

    if (next) {
      tx.update(docRef, {
        phase: next,
        updatedAt: now,
      });
      return { ...business, phase: next, updatedAt: now };
    }

    // Already at the final phase — mark complete if milestones are done.
    if (isPhaseComplete(business.phase, business.phaseMilestones)) {
      tx.update(docRef, {
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      });
      const completed: CeoBusiness = {
        ...business,
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      };
      return completed;
    }

    // Nothing to advance — still bump updatedAt so callers see fresh state.
    tx.update(docRef, { updatedAt: now });
    return { ...business, updatedAt: now };
  });

  return updated;
}

// ─── Events ──────────────────────────────────────────────────

/** Persist a new event generated by the eventEngine. Sets status = 'pending',
 *  createdAt = now, expiresAt = now + 72h (kept short to bound the queue). */
export async function saveCeoEvent(
  event: Omit<
    CeoEvent,
    | 'id'
    | 'status'
    | 'createdAt'
    | 'expiresAt'
    | 'decidedChoice'
    | 'decisionTimestamp'
    | 'responseTimeSeconds'
    | 'scores'
    | 'feedback'
  > & { deliveredVia?: CeoDeliveryChannel | null },
): Promise<CeoEvent> {
  const docRef = adminDb.collection(CEO_EVENTS_COLLECTION).doc();
  const id = docRef.id;
  const nowMs = Date.now();
  const now = Timestamp.fromMillis(nowMs);
  const expiresAt = Timestamp.fromMillis(nowMs + EVENT_TTL_MS);

  const doc: CeoEvent = {
    id,
    businessId: event.businessId,
    userId: event.userId,
    kidId: event.kidId,
    title: event.title,
    description: event.description,
    category: event.category,
    phase: event.phase,
    milestone: event.milestone ?? null,
    choices: event.choices,
    status: 'pending',
    decidedChoice: null,
    decisionTimestamp: null,
    responseTimeSeconds: null,
    scores: null,
    feedback: null,
    deliveredVia: event.deliveredVia ?? null,
    createdAt: now,
    expiresAt,
  };

  await docRef.set(stripUndefined(doc));
  return doc;
}

/** Fetch an event by ID. Throws NOT_FOUND if missing. */
export async function getCeoEvent(eventId: string): Promise<CeoEvent> {
  const doc = await adminDb.collection(CEO_EVENTS_COLLECTION).doc(eventId).get();
  if (!doc.exists) {
    throw new AppException('NOT_FOUND', 'Event not found', 404);
  }
  return docToCeoEvent(doc);
}

/** Currently-pending event for a business (there should be at most one).
 *  Returns null if none pending. */
export async function getPendingEventForBusiness(
  businessId: string,
): Promise<CeoEvent | null> {
  const snapshot = await adminDb
    .collection(CEO_EVENTS_COLLECTION)
    .where('businessId', '==', businessId)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return docToCeoEvent(snapshot.docs[0]!);
}

/** Decision history for a business, oldest → newest, includes scores + feedback. */
export async function listDecidedEventsForBusiness(
  businessId: string,
  limit: number = 50,
): Promise<CeoEvent[]> {
  const snapshot = await adminDb
    .collection(CEO_EVENTS_COLLECTION)
    .where('businessId', '==', businessId)
    .where('status', '==', 'decided')
    .orderBy('decisionTimestamp', 'asc')
    .limit(limit)
    .get();

  return snapshot.docs.map(docToCeoEvent);
}

/** Record the kid's decision on an event. Atomic — runs in a Firestore
 *  transaction that also updates the business and profile.
 *
 *  Validates event.status === 'pending' inside the transaction to avoid
 *  double-decide races. The transaction reads all three docs first, then
 *  writes all three, so either everything lands or nothing does. */
export async function recordEventDecision(params: {
  eventId: string;
  businessId: string;
  choiceId: CeoChoiceId;
  choiceText: string;
  responseTimeSeconds: number;
  scores: CeoDimensionScores;
  feedback: string;
  milestoneResolved?: string | null;
  businessStateUpdates: Partial<CeoBusiness>;
  profileDimensionUpdates: CeoProfile['dimensions'];
}): Promise<{ event: CeoEvent; business: CeoBusiness; profile: CeoProfile }> {
  const eventRef = adminDb.collection(CEO_EVENTS_COLLECTION).doc(params.eventId);
  const businessRef = adminDb.collection(CEO_BUSINESS_COLLECTION).doc(params.businessId);

  const result = await adminDb.runTransaction(async (tx) => {
    // ── Reads first (Firestore transaction rule) ───────────────
    const eventDoc = await tx.get(eventRef);
    if (!eventDoc.exists) {
      throw new AppException('NOT_FOUND', 'Event not found', 404);
    }
    const eventData = docToCeoEvent(eventDoc);
    if (eventData.businessId !== params.businessId) {
      throw new AppException('EVENT_BUSINESS_MISMATCH', 'Event does not belong to this business', 400);
    }
    if (eventData.status !== 'pending') {
      throw new AppException('ALREADY_DECIDED', 'Event already decided', 400);
    }

    const businessDoc = await tx.get(businessRef);
    if (!businessDoc.exists) {
      throw new AppException('NOT_FOUND', 'Business not found', 404);
    }
    const businessData = docToCeoBusiness(businessDoc);

    // Profile is keyed by businessId (deterministic) — look up atomically.
    const profileQuery = adminDb
      .collection(CEO_PROFILES_COLLECTION)
      .where('businessId', '==', params.businessId)
      .limit(1);
    const profileSnapshot = await tx.get(profileQuery);
    if (profileSnapshot.empty) {
      throw new AppException('NOT_FOUND', 'Profile not found for business', 404);
    }
    const profileDocSnap = profileSnapshot.docs[0]!;
    const profileRef = profileDocSnap.ref;
    const profileData = docToCeoProfile(profileDocSnap);

    // ── Now writes ─────────────────────────────────────────────
    const now = Timestamp.now();

    // 1. Event → mark decided with scoring metadata
    const eventUpdate = {
      status: 'decided' as const,
      decidedChoice: params.choiceId,
      decisionTimestamp: now,
      responseTimeSeconds: params.responseTimeSeconds,
      scores: params.scores,
      feedback: params.feedback,
    };
    tx.update(eventRef, stripUndefined(eventUpdate));

    // 2. Business → apply provided state updates + resolve milestone if any
    const mergedMilestones = { ...businessData.phaseMilestones };
    if (params.milestoneResolved) {
      mergedMilestones[params.milestoneResolved] = 'resolved';
    }
    const {
      id: _bid,
      userId: _buid,
      kidId: _bkid,
      createdAt: _bc,
      ...businessRest
    } = params.businessStateUpdates;
    const businessUpdate = stripUndefined({
      ...businessRest,
      phaseMilestones: mergedMilestones,
      totalDecisions: (businessData.totalDecisions ?? 0) + 1,
      updatedAt: now,
    });
    tx.update(businessRef, businessUpdate);

    // 3. Profile → replace dimensions, bump counts + avg response time
    const prevTotal = profileData.totalDecisions ?? 0;
    const newTotal = prevTotal + 1;
    const newAvg =
      prevTotal === 0
        ? params.responseTimeSeconds
        : (profileData.avgResponseTime * prevTotal + params.responseTimeSeconds) / newTotal;

    const profileUpdate = stripUndefined({
      dimensions: params.profileDimensionUpdates,
      totalDecisions: newTotal,
      avgResponseTime: newAvg,
      currentPhase: businessData.phase,
      updatedAt: now,
    });
    tx.update(profileRef, profileUpdate);

    // Compose return values from merged reads + writes
    const returnedEvent: CeoEvent = { ...eventData, ...eventUpdate };
    const returnedBusiness: CeoBusiness = {
      ...businessData,
      ...(businessRest as Partial<CeoBusiness>),
      phaseMilestones: mergedMilestones,
      totalDecisions: (businessData.totalDecisions ?? 0) + 1,
      updatedAt: now,
    };
    const returnedProfile: CeoProfile = {
      ...profileData,
      dimensions: params.profileDimensionUpdates,
      totalDecisions: newTotal,
      avgResponseTime: newAvg,
      currentPhase: businessData.phase,
      updatedAt: now,
    };

    return { event: returnedEvent, business: returnedBusiness, profile: returnedProfile };
  });

  return result;
}

// ─── Profiles ────────────────────────────────────────────────

/** Get or create the CeoProfile for a business. Seeds with all dimensions at
 *  50 (neutral baseline) on first access. Requires userId + kidId so the
 *  created profile is properly scoped to the owning kid. */
export async function getOrCreateCeoProfile(params: {
  userId: string;
  kidId: string;
  businessId: string;
}): Promise<CeoProfile> {
  // Look up by businessId first — profile is 1:1 with business.
  const existing = await adminDb
    .collection(CEO_PROFILES_COLLECTION)
    .where('businessId', '==', params.businessId)
    .limit(1)
    .get();

  if (!existing.empty) {
    return docToCeoProfile(existing.docs[0]!);
  }

  // Fetch business to seed currentPhase.
  const businessDoc = await adminDb
    .collection(CEO_BUSINESS_COLLECTION)
    .doc(params.businessId)
    .get();
  if (!businessDoc.exists) {
    throw new AppException('NOT_FOUND', 'Business not found', 404);
  }
  const business = docToCeoBusiness(businessDoc);

  const docRef = adminDb.collection(CEO_PROFILES_COLLECTION).doc();
  const id = docRef.id;
  const now = Timestamp.now();

  const profile: CeoProfile = {
    id,
    userId: params.userId,
    kidId: params.kidId,
    businessId: params.businessId,
    dimensions: seedDimensions() as CeoProfile['dimensions'],
    totalDecisions: 0,
    avgResponseTime: 0,
    currentPhase: business.phase,
    shareUrl: '',
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(stripUndefined(profile));
  return profile;
}

/** Fetch a profile by businessId. Throws NOT_FOUND if missing. */
export async function getCeoProfileByBusiness(businessId: string): Promise<CeoProfile> {
  const snapshot = await adminDb
    .collection(CEO_PROFILES_COLLECTION)
    .where('businessId', '==', businessId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new AppException('NOT_FOUND', 'Profile not found', 404);
  }
  return docToCeoProfile(snapshot.docs[0]!);
}

/** Fetch a publicly-shareable profile by its shareUrl. Returns null if not
 *  public or not found. Used by /api/ceo/profile?s=<shareUrl>. */
export async function getPublicCeoProfile(shareUrl: string): Promise<CeoProfile | null> {
  if (!shareUrl) return null;

  const snapshot = await adminDb
    .collection(CEO_PROFILES_COLLECTION)
    .where('shareUrl', '==', shareUrl)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const profile = docToCeoProfile(snapshot.docs[0]!);
  if (!profile.isPublic) return null;
  return profile;
}

/** Toggle the profile's isPublic flag and mint a shareUrl if becoming public.
 *
 *  Atomicity: the slug mint runs inside `adminDb.runTransaction` so the
 *  uniqueness check + claim happen as a single Firestore operation. Two
 *  concurrent toggles racing on the same profile cannot both write the
 *  same slug; the loser sees the winner's claim on re-read and either
 *  skips minting (already public) or picks a different slug. */
export async function setCeoProfilePublic(params: {
  businessId: string;
  isPublic: boolean;
}): Promise<CeoProfile> {
  const lookup = await adminDb
    .collection(CEO_PROFILES_COLLECTION)
    .where('businessId', '==', params.businessId)
    .limit(1)
    .get();

  if (lookup.empty) {
    throw new AppException('NOT_FOUND', 'Profile not found', 404);
  }
  const profileRef = lookup.docs[0]!.ref;

  return adminDb.runTransaction(async (txn) => {
    const snap = await txn.get(profileRef);
    if (!snap.exists) {
      throw new AppException('NOT_FOUND', 'Profile not found', 404);
    }
    const existing = docToCeoProfile(snap);
    const now = Timestamp.now();

    // Toggle off → clear publicness but keep the existing shareUrl (so the
    // user can republish without a new link). Toggle on → mint a shareUrl
    // if one isn't already set.
    let shareUrl = existing.shareUrl ?? '';
    if (params.isPublic && !shareUrl) {
      for (let attempt = 0; attempt < SHARE_URL_MAX_RETRIES; attempt += 1) {
        const candidate = mintShareSlug();
        // Collision check runs inside the transaction via txn.get, so a
        // concurrent mint writing the same slug will be serialised and one
        // of the two transactions will retry on the locked doc.
        const collision = await txn.get(
          adminDb
            .collection(CEO_PROFILES_COLLECTION)
            .where('shareUrl', '==', candidate)
            .limit(1),
        );
        if (collision.empty) {
          shareUrl = candidate;
          break;
        }
      }
      if (!shareUrl) {
        throw new AppException(
          'SHARE_URL_COLLISION',
          'Could not mint a unique share URL after retries',
          500,
        );
      }
    }

    const update = {
      isPublic: params.isPublic,
      shareUrl,
      updatedAt: now,
    };
    txn.update(profileRef, update);

    return { ...existing, ...update };
  });
}
