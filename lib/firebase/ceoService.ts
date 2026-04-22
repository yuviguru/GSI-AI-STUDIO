import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { adminDb } from './admin';
import { AppException } from '@/lib/api-utils';
import { initialMilestones, nextPhase, isPhaseComplete } from '@/lib/ceo/phases';
import {
  STARTING_CAPITAL,
  BUSINESS_TYPE_DEFAULT_NAMES,
  DIMENSIONS,
  coerceLegacyPace,
  stakesMultiplierFor,
  MILESTONE_FALLBACK_CATEGORY,
} from '@/lib/ceo/constants';
import { istDayKey, nextMilestoneAtIst } from '@/lib/ceo/cadence';
import type {
  CeoBusiness,
  CeoEndingReport,
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
/** YYYY-MM-DD in UTC — legacy helper retained for backwards compat. Phase
 *  3 Daily Rhythm locks the regular-event cap reset to IST midnight (D2),
 *  so new call sites should use `istDayKey` from `@/lib/ceo/cadence`.
 *  @deprecated Use `istDayKey()` for new code. */
export function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

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
    // Legacy 30/60/90 docs from pre-refactor coerced to the new 15/30/45
    // union so callers downstream can treat pace as a typed enum.
    pace: coerceLegacyPace(data.pace),
    nextEventAt: data.nextEventAt ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    completedAt: data.completedAt ?? null,
    dailyRegularEventCount: data.dailyRegularEventCount ?? 0,
    lastRegularEventDayUtc: data.lastRegularEventDayUtc ?? undefined,
    lastMilestoneDeliveredAt: data.lastMilestoneDeliveredAt ?? null,
    pendingMilestoneEventId: data.pendingMilestoneEventId ?? null,
    pendingRegularEventId: data.pendingRegularEventId ?? null,
    nextMilestoneScheduledAt: data.nextMilestoneScheduledAt ?? null,
    brandAssets: data.brandAssets ?? null,
    marketingDailyPostCount: data.marketingDailyPostCount ?? 0,
    marketingLastPostDayUtc: data.marketingLastPostDayUtc ?? undefined,
  };
}

function docToCeoEvent(doc: FirebaseFirestore.DocumentSnapshot): CeoEvent {
  const data = doc.data()!;
  // Legacy events written before PR2 have neither eventType nor namedTitle.
  // Derive eventType from `milestone` so existing data still classifies
  // correctly (milestone set → milestone event, else regular).
  const eventType: CeoEvent['eventType'] =
    (data.eventType as CeoEvent['eventType']) ??
    (data.milestone ? 'milestone' : 'regular');
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
    eventType,
    namedTitle: data.namedTitle ?? undefined,
    scheduledFor: data.scheduledFor ?? null,
    stakesMultiplier: data.stakesMultiplier ?? undefined,
    agentWorkflowId: data.agentWorkflowId ?? undefined,
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

  // Phase 3 Daily Rhythm: the register route mints the first milestone
  // synchronously right after this, so the NEXT cron tick should be
  // tomorrow's 18:30 IST. `saveCeoEvent` will set the pending pointer
  // atomically when the first event lands; we seed with null here so a
  // briefly-orphaned row is still well-typed.
  const nextMilestoneTickUtcMs = nextMilestoneAtIst(new Date()).getTime();

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
    // PR2 — regular-event cap + milestone-cron tracking.
    // lastMilestoneDeliveredAt = now because /api/ceo/register immediately
    // generates the first milestone event, so the cron should wait a full
    // IST day before delivering the next one.
    dailyRegularEventCount: 0,
    lastRegularEventDayUtc: istDayKey(new Date()),
    lastMilestoneDeliveredAt: now,
    // Phase 3 Daily Rhythm — dual pending slots + scheduled milestone.
    pendingMilestoneEventId: null,
    pendingRegularEventId: null,
    nextMilestoneScheduledAt: Timestamp.fromMillis(nextMilestoneTickUtcMs),
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
 *  createdAt = now, expiresAt = now + 72h (kept short to bound the queue).
 *
 *  Phase 3 Daily Rhythm: also sets the matching pending pointer on the
 *  parent business (`pendingMilestoneEventId` or `pendingRegularEventId`)
 *  atomically in a transaction, so downstream readers see "this event is
 *  pending for this business" in a single Firestore round-trip without
 *  having to re-query the events collection. */
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
  const eventRef = adminDb.collection(CEO_EVENTS_COLLECTION).doc();
  const id = eventRef.id;
  const nowMs = Date.now();
  const now = Timestamp.fromMillis(nowMs);
  const expiresAt = Timestamp.fromMillis(nowMs + EVENT_TTL_MS);

  // PR2: derive eventType from the caller's input (eventEngine always sets
  // it now, but older code paths that still pass only `milestone` are
  // handled by deriving from milestone-presence).
  const eventType: CeoEvent['eventType'] =
    event.eventType ?? (event.milestone ? 'milestone' : 'regular');

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
    eventType,
    namedTitle: event.namedTitle,
    scheduledFor: event.scheduledFor ?? null,
    stakesMultiplier: event.stakesMultiplier,
    agentWorkflowId: event.agentWorkflowId,
  };

  const businessRef = adminDb.collection(CEO_BUSINESS_COLLECTION).doc(event.businessId);
  const pendingPointerField =
    eventType === 'milestone' ? 'pendingMilestoneEventId' : 'pendingRegularEventId';

  await adminDb.runTransaction(async (tx) => {
    tx.set(eventRef, stripUndefined(doc));
    tx.update(businessRef, {
      [pendingPointerField]: id,
      updatedAt: now,
    });
  });

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

/** Currently-pending event for a business.
 *
 *  Phase 3: a business can have up to TWO pending events at once (one
 *  milestone + one regular) — they coexist in separate UI zones and
 *  don't block each other. This helper resolves the first non-null of
 *  {milestone, regular}, preferring the milestone so legacy callers
 *  (which expected a single pending event) keep seeing the headline
 *  event when both are set. New code should use the typed helpers
 *  `getPendingMilestoneForBusiness` / `getPendingRegularForBusiness`.
 *
 *  @deprecated Use the typed helpers; this shim is kept for
 *  pre-Phase-3 callers. */
export async function getPendingEventForBusiness(
  businessId: string,
): Promise<CeoEvent | null> {
  const [milestone, regular] = await Promise.all([
    getPendingMilestoneForBusiness(businessId),
    getPendingRegularForBusiness(businessId),
  ]);
  return milestone ?? regular ?? null;
}

/** Phase 3 — pending milestone event for a business, resolved through the
 *  business-level pointer (`pendingMilestoneEventId`). Returns null when
 *  nothing is pending. Fast path: one doc read for the pointer + one for
 *  the event when set. */
export async function getPendingMilestoneForBusiness(
  businessId: string,
): Promise<CeoEvent | null> {
  return resolvePendingEventByPointer(businessId, 'pendingMilestoneEventId');
}

/** Phase 3 — pending regular event for a business, resolved through the
 *  business-level pointer (`pendingRegularEventId`). */
export async function getPendingRegularForBusiness(
  businessId: string,
): Promise<CeoEvent | null> {
  return resolvePendingEventByPointer(businessId, 'pendingRegularEventId');
}

async function resolvePendingEventByPointer(
  businessId: string,
  field: 'pendingMilestoneEventId' | 'pendingRegularEventId',
): Promise<CeoEvent | null> {
  const bizDoc = await adminDb.collection(CEO_BUSINESS_COLLECTION).doc(businessId).get();
  if (!bizDoc.exists) return null;
  const eventId = bizDoc.data()?.[field] as string | null | undefined;
  if (!eventId) return null;

  const eventDoc = await adminDb.collection(CEO_EVENTS_COLLECTION).doc(eventId).get();
  if (!eventDoc.exists) return null;
  const event = docToCeoEvent(eventDoc);
  // Defensive: if the pointer references a decided/expired event (stale
  // pointer that somehow slipped past clearing), treat as not-pending so
  // the UI doesn't surface a dead event.
  if (event.status !== 'pending') return null;
  return event;
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
    // Phase 3 Daily Rhythm: clear the matching pending pointer atomically
    // with the decision write. Milestone decision → clear
    // pendingMilestoneEventId; regular decision → clear pendingRegularEventId.
    const eventTypeForClear: CeoEvent['eventType'] =
      eventData.eventType ?? (eventData.milestone ? 'milestone' : 'regular');
    const pendingPointerField =
      eventTypeForClear === 'milestone' ? 'pendingMilestoneEventId' : 'pendingRegularEventId';

    const businessUpdate = stripUndefined({
      ...businessRest,
      phaseMilestones: mergedMilestones,
      totalDecisions: (businessData.totalDecisions ?? 0) + 1,
      [pendingPointerField]: null,
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
      [pendingPointerField]: null,
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

// ─── Regular-event daily cap ─────────────────────────────────

/** Result of reserving a regular-event slot for today. `allowed: false`
 *  means the kid hit the daily cap — caller should surface a
 *  "Come back tomorrow" message rather than minting another event. */
export interface RegularEventReservation {
  allowed: boolean;
  /** How many regular events have been decided TODAY (after this
   *  reservation fires if allowed). Exposed so the UI can render
   *  "3 of 5" progress. */
  countToday: number;
  cap: number;
}

/** Reserve a regular-event slot inside a Firestore transaction. Bumps
 *  `dailyRegularEventCount` by 1 if we're still under the cap, rolling
 *  the counter over when the kid crosses UTC midnight. Does NOT generate
 *  the event — caller does that on `allowed: true`.
 *
 *  Lives on `ceoBusiness` (not sessions) so the cap is per-business, not
 *  global — a kid juggling 3 active businesses can decide 5 regulars per
 *  business per day. */
export async function reserveRegularEventSlot(
  businessId: string,
  cap: number,
): Promise<RegularEventReservation> {
  const ref = adminDb.collection(CEO_BUSINESS_COLLECTION).doc(businessId);
  const today = istDayKey(new Date());

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new AppException('NOT_FOUND', 'Business not found', 404);
    }
    const data = snap.data() ?? {};
    const lastDay = data.lastRegularEventDayUtc as string | undefined;
    const prevCount = (data.dailyRegularEventCount as number | undefined) ?? 0;

    const effectiveCount = lastDay === today ? prevCount : 0;
    if (effectiveCount >= cap) {
      return { allowed: false, countToday: effectiveCount, cap };
    }

    const nextCount = effectiveCount + 1;
    tx.update(ref, {
      dailyRegularEventCount: nextCount,
      lastRegularEventDayUtc: today,
      updatedAt: Timestamp.now(),
    });
    return { allowed: true, countToday: nextCount, cap };
  });
}

/** Inverse of `reserveRegularEventSlot` — decrements the day counter by 1
 *  (floored at 0) in the same UTC day. Called when the generation/save AFTER
 *  a successful reservation fails, so the kid doesn't lose a slot to a
 *  transient error they couldn't see.
 *
 *  Safe across the UTC-midnight boundary: if the day key has rolled over
 *  since the reservation, we DON'T decrement the new day's count — old-day
 *  slot is effectively forfeited (acceptable vs. the alternative of
 *  clobbering today's legitimate count). */
export async function releaseRegularEventSlot(
  businessId: string,
): Promise<{ countToday: number }> {
  const ref = adminDb.collection(CEO_BUSINESS_COLLECTION).doc(businessId);
  const today = istDayKey(new Date());

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new AppException('NOT_FOUND', 'Business not found', 404);
    }
    const data = snap.data() ?? {};
    const lastDay = data.lastRegularEventDayUtc as string | undefined;
    const prevCount = (data.dailyRegularEventCount as number | undefined) ?? 0;

    // If the day has rolled over between reservation and release, the slot
    // we reserved was on a PRIOR UTC day whose counter has already been
    // reset. Releasing would clobber today's legitimate count — no-op.
    // `lastDay !== today` means either the counter is for an earlier day
    // (returns 0 as-if-empty) or there's never been a regular-event write
    // on this doc at all (also 0).
    if (lastDay !== today) {
      return { countToday: 0 };
    }

    const next = Math.max(0, prevCount - 1);
    tx.update(ref, {
      dailyRegularEventCount: next,
      lastRegularEventDayUtc: today,
      updatedAt: Timestamp.now(),
    });
    return { countToday: next };
  });
}

/** Phase 3 Daily Rhythm — expire a stale pending milestone and apply the
 *  D3 scaling penalty to the parent business. Used by the milestone
 *  delivery cron when it finds a pending milestone from a previous IST
 *  day (kid skipped yesterday's Big Choice).
 *
 *  Penalty formula (locked in `KIDCEO-PHASE-3-DECISIONS.md` D3):
 *    - reputation delta  = -1 × stakesMultiplier
 *    - morale delta      = -1 × stakesMultiplier
 *    - cash delta        = -₹50 × stakesMultiplier if the event category
 *                           is cash-adjacent (`capital` | `risk`), else 0
 *  All deltas applied through Math.max(0, current + delta) — floors at 0
 *  so a skipping streak cannot push a kid into unrecoverable negatives.
 *
 *  Runs in a transaction so (event → expired) + (business penalty +
 *  pointer clear) land atomically. Returns the expired event and the
 *  applied penalty for logging / kid-facing recap copy. */
export interface StaleMilestoneExpiryResult {
  event: CeoEvent;
  penalty: {
    reputation: number; // signed delta actually applied (<= 0)
    morale: number;
    cash: number;
    stakesMultiplier: number;
  };
}

const CASH_ADJACENT_CATEGORIES = new Set(['capital', 'risk']);

export async function expireStaleMilestone(
  businessId: string,
): Promise<StaleMilestoneExpiryResult | null> {
  const businessRef = adminDb.collection(CEO_BUSINESS_COLLECTION).doc(businessId);

  return adminDb.runTransaction(async (tx) => {
    const businessSnap = await tx.get(businessRef);
    if (!businessSnap.exists) return null;
    const business = docToCeoBusiness(businessSnap);

    const pendingId = business.pendingMilestoneEventId;
    if (!pendingId) return null;

    const eventRef = adminDb.collection(CEO_EVENTS_COLLECTION).doc(pendingId);
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) {
      // Pointer is stale — just clear it and return null. This is a
      // defensive branch; pointer/event should always agree in practice.
      tx.update(businessRef, {
        pendingMilestoneEventId: null,
        updatedAt: Timestamp.now(),
      });
      return null;
    }
    const event = docToCeoEvent(eventSnap);
    if (event.status !== 'pending') {
      // Event was decided / already expired between read and here — clear
      // the pointer if it's still set to this event. No penalty (the kid
      // didn't actually skip).
      tx.update(businessRef, {
        pendingMilestoneEventId: null,
        updatedAt: Timestamp.now(),
      });
      return null;
    }

    // Resolve the stakes multiplier from either the event's own
    // `stakesMultiplier` (eventEngine sets this at save time) or, as a
    // fallback for legacy rows, from the milestone name via
    // stakesMultiplierFor().
    const M =
      typeof event.stakesMultiplier === 'number' && event.stakesMultiplier > 0
        ? event.stakesMultiplier
        : stakesMultiplierFor(event.milestone);

    const category =
      event.category ||
      (event.milestone ? MILESTONE_FALLBACK_CATEGORY[event.milestone] : undefined) ||
      'operations';
    const isCashAdjacent = CASH_ADJACENT_CATEGORIES.has(category);

    const repDelta = -1 * M;
    const moraleDelta = -1 * M;
    const cashDelta = isCashAdjacent ? -50 * M : 0;

    const now = Timestamp.now();

    // 1. Event → expired.
    tx.update(eventRef, {
      status: 'expired' as const,
      decisionTimestamp: now,
    });

    // 2. Business → apply floored penalties + clear pointer.
    tx.update(businessRef, {
      reputation: Math.max(0, (business.reputation ?? 0) + repDelta),
      morale: Math.max(0, (business.morale ?? 0) + moraleDelta),
      currentCash: Math.max(0, (business.currentCash ?? 0) + cashDelta),
      pendingMilestoneEventId: null,
      updatedAt: now,
    });

    return {
      event: { ...event, status: 'expired' as const, decisionTimestamp: now },
      penalty: {
        reputation: repDelta,
        morale: moraleDelta,
        cash: cashDelta,
        stakesMultiplier: M,
      },
    };
  });
}

/** Mark a milestone event as delivered for scheduling purposes. The daily
 *  cron uses `lastMilestoneDeliveredAt` to decide whether a business is due
 *  for its next milestone event. Called by the cron + on register (where
 *  the first milestone is delivered synchronously). */
export async function markMilestoneDelivered(businessId: string): Promise<void> {
  const now = Timestamp.now();
  // Phase 3 Daily Rhythm: also advance `nextMilestoneScheduledAt` to the
  // next 18:30 IST tick so the cron's fixed-hour gate knows when to try
  // this business again. Using the helper keeps the math in one place.
  const nextTickUtcMs = nextMilestoneAtIst(new Date()).getTime();
  await adminDb
    .collection(CEO_BUSINESS_COLLECTION)
    .doc(businessId)
    .update({
      lastMilestoneDeliveredAt: now,
      nextMilestoneScheduledAt: Timestamp.fromMillis(nextTickUtcMs),
      updatedAt: now,
    });
}

/** Return active businesses whose last milestone delivery was ≥ `minIntervalMs`
 *  ago — candidates for the daily cron to send the next TODAY'S BIG CHOICE to.
 *
 *  Page-size capped at `limit` to keep the cron's worst-case runtime bounded
 *  (Netlify scheduled functions get ~10s wall clock). If we ever exceed that
 *  on a single run, the next run 2h later picks up the tail — no business is
 *  starved for long. */
export async function listBusinessesDueForMilestone(params: {
  minIntervalMs: number;
  limit?: number;
}): Promise<CeoBusiness[]> {
  const cutoff = Timestamp.fromMillis(Date.now() - params.minIntervalMs);
  const limit = params.limit ?? 100;

  try {
    const snap = await adminDb
      .collection(CEO_BUSINESS_COLLECTION)
      .where('status', '==', 'active')
      .where('lastMilestoneDeliveredAt', '<=', cutoff)
      .orderBy('lastMilestoneDeliveredAt', 'asc')
      .limit(limit)
      .get();
    return snap.docs.map(docToCeoBusiness);
  } catch (err) {
    if (isIndexBuildingError(err)) {
      console.warn('[ceoService] milestone-due index still building; returning []');
      return [];
    }
    throw err;
  }
}

/** Phase 3 Daily Rhythm — list active businesses whose scheduled
 *  milestone tick is at or before `upTo`. Used by the cron instead of
 *  the pace-based `listBusinessesDueForMilestone`.
 *
 *  Businesses missing `nextMilestoneScheduledAt` (legacy pre-Phase-3
 *  rows) are picked up by the old query path instead; the cron calls
 *  both during the transition window. */
export async function listBusinessesDueByScheduledAt(params: {
  upTo: Date;
  limit?: number;
}): Promise<CeoBusiness[]> {
  const cutoff = Timestamp.fromMillis(params.upTo.getTime());
  const limit = params.limit ?? 100;
  try {
    const snap = await adminDb
      .collection(CEO_BUSINESS_COLLECTION)
      .where('status', '==', 'active')
      .where('nextMilestoneScheduledAt', '<=', cutoff)
      .orderBy('nextMilestoneScheduledAt', 'asc')
      .limit(limit)
      .get();
    return snap.docs.map(docToCeoBusiness);
  } catch (err) {
    if (isIndexBuildingError(err)) {
      console.warn(
        '[ceoService] due-by-scheduledAt index still building; returning []',
      );
      return [];
    }
    throw err;
  }
}

/** Return the last N decided events for a business, newest first. Used
 *  to feed `recentEventTitles` + `recentNamedTitles` into the event
 *  generator so it can avoid repeating angles. Returns [] if the index
 *  is still building — graceful degradation, the LLM just loses variety
 *  context for that generation. */
export async function getRecentEventsForBusiness(
  businessId: string,
  limit = 5,
): Promise<CeoEvent[]> {
  try {
    const snapshot = await adminDb
      .collection(CEO_EVENTS_COLLECTION)
      .where('businessId', '==', businessId)
      .where('status', '==', 'decided')
      .orderBy('decisionTimestamp', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(docToCeoEvent);
  } catch (err) {
    if (isIndexBuildingError(err)) return [];
    throw err;
  }
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

/** Merge an ending report onto the profile doc. Fire-and-forgotten by the
 *  decide route when a business transitions to `status === 'completed'`.
 *
 *  Uses `set({ merge: true })` so this overwrites `ending` + `updatedAt`
 *  without touching other fields (isPublic, shareUrl, dimensions, etc.).
 *  Idempotent — regenerating the report replaces the prior one. */
export async function saveCeoProfileEnding(
  profileId: string,
  ending: CeoEndingReport,
): Promise<void> {
  if (!profileId) {
    throw new AppException('INVALID_INPUT', 'profileId is required', 400);
  }
  await adminDb
    .collection(CEO_PROFILES_COLLECTION)
    .doc(profileId)
    .set(
      stripUndefined({
        ending,
        updatedAt: Timestamp.now(),
      }),
      { merge: true },
    );
}
