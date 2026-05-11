/**
 * Test-data seeder for GSI AI Studio.
 *
 * Seeds the full graph needed to exercise every dashboard journey:
 *   1 school   → 2 classes
 *   2 teachers + 1 schoolAdmin
 *   2 parents  → 4 kids (linked + anonymous mix)
 *   2 assignments + 2 submissions
 *   DPDP consent records, parent channel preferences, commsLog history
 *   3 notifications (one per role), 1 PTM note (draft + sent), 1 SIS config
 *   Sample creations on each kid
 *
 * Usage:
 *   pnpm seed:test           # idempotent upsert against the configured
 *                            # Firebase project (uses FIREBASE_* env vars)
 *   pnpm seed:test -- --reset
 *                            # delete every seeded doc (matches the
 *                            # `test_` prefix), then re-create
 *   pnpm seed:test -- --dry-run
 *                            # print the seed plan without writing
 *
 * Targeting the emulator:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *   FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
 *   pnpm seed:test
 *
 * IDs are deterministic (prefixed with `test_`) so re-running upserts
 * rather than duplicating. Auth users are keyed by phone — re-running with
 * the same phone updates the existing user.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../lib/firebase/admin';

// ─── CLI ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

function log(...parts: unknown[]) {
  console.log('[seed]', ...parts);
}
function vlog(...parts: unknown[]) {
  if (VERBOSE) console.log('[seed]', ...parts);
}

// ─── Determine target environment ─────────────────────────────────────────

const USING_EMULATOR =
  !!process.env.FIRESTORE_EMULATOR_HOST ||
  !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '(unset)';

// ─── Fixtures ─────────────────────────────────────────────────────────────

const PHONE = {
  schoolAdmin: '+919000000001',
  teacher1: '+919000000002',
  teacher2: '+919000000003',
  parent1: '+919000000010',
  parent2: '+919000000011',
} as const;

const UID = {
  schoolAdmin: 'test_user_school_admin',
  teacher1: 'test_user_teacher_1',
  teacher2: 'test_user_teacher_2',
  parent1: 'test_user_parent_1',
  parent2: 'test_user_parent_2',
} as const;

const SCHOOL_ID = 'test_school_gsi';
const CLASS_6A_ID = 'test_class_6a';
const CLASS_7B_ID = 'test_class_7b';
const KID = {
  aarav: 'test_kid_aarav',
  diya: 'test_kid_diya',
  krish: 'test_kid_krish',
  sneha: 'test_kid_sneha',
} as const;
const ASSIGNMENT = {
  story6a: 'test_assignment_story_6a',
  quiz7b: 'test_assignment_quiz_7b',
} as const;
const SUBMISSION = {
  aaravStory: 'test_submission_aarav_story',
  krishQuiz: 'test_submission_krish_quiz',
} as const;
const CREATION = {
  aaravStory: 'test_creation_aarav_story',
  diyaMusic: 'test_creation_diya_music',
  krishGame: 'test_creation_krish_game',
} as const;
const PTM_NOTE_DRAFT = 'test_ptm_aarav_draft';
const PTM_NOTE_SENT = 'test_ptm_diya_sent';

// ─── Helpers ──────────────────────────────────────────────────────────────

const now = () => Timestamp.now();

async function upsertAuthUser(input: {
  uid: string;
  phone: string;
  displayName: string;
  customClaims?: Record<string, unknown>;
}) {
  if (DRY_RUN) {
    vlog(`auth: upsert ${input.uid} (${input.phone})`);
    return;
  }
  try {
    await adminAuth.updateUser(input.uid, {
      phoneNumber: input.phone,
      displayName: input.displayName,
      disabled: false,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/user-not-found') {
      await adminAuth.createUser({
        uid: input.uid,
        phoneNumber: input.phone,
        displayName: input.displayName,
      });
    } else {
      throw err;
    }
  }
  if (input.customClaims) {
    await adminAuth.setCustomUserClaims(input.uid, input.customClaims);
  }
}

async function setDoc(path: string, data: Record<string, unknown>) {
  if (DRY_RUN) {
    vlog(`firestore: set ${path}`);
    return;
  }
  // path like "users/abc" or "schools/x/classes/y"
  const segments = path.split('/');
  let ref: FirebaseFirestore.DocumentReference = adminDb.collection(segments[0]!).doc(segments[1]!);
  for (let i = 2; i < segments.length; i += 2) {
    ref = ref.collection(segments[i]!).doc(segments[i + 1]!);
  }
  await ref.set(data, { merge: true });
}

async function deletePrefix(collection: string, prefix: string) {
  const snap = await adminDb.collection(collection).get();
  let count = 0;
  for (const doc of snap.docs) {
    if (doc.id.startsWith(prefix)) {
      await doc.ref.delete();
      count += 1;
    }
  }
  return count;
}

async function deleteWhere(
  collection: string,
  field: string,
  op: FirebaseFirestore.WhereFilterOp,
  value: unknown,
) {
  const snap = await adminDb.collection(collection).where(field, op, value).get();
  let count = 0;
  for (const doc of snap.docs) {
    await doc.ref.delete();
    count += 1;
  }
  return count;
}

// ─── Seed steps ───────────────────────────────────────────────────────────

async function seedAuthAndUsers() {
  log('seeding auth users + Firestore user docs…');

  await upsertAuthUser({
    uid: UID.schoolAdmin,
    phone: PHONE.schoolAdmin,
    displayName: 'Priya Iyer (Principal)',
    customClaims: { role: 'schoolAdmin', schoolId: SCHOOL_ID },
  });
  await upsertAuthUser({
    uid: UID.teacher1,
    phone: PHONE.teacher1,
    displayName: 'Anand Kumar',
    customClaims: { role: 'teacher', schoolId: SCHOOL_ID },
  });
  await upsertAuthUser({
    uid: UID.teacher2,
    phone: PHONE.teacher2,
    displayName: 'Meera Nair',
    customClaims: { role: 'teacher', schoolId: SCHOOL_ID },
  });
  await upsertAuthUser({
    uid: UID.parent1,
    phone: PHONE.parent1,
    displayName: 'Rajesh Sharma',
    customClaims: { role: 'parent' },
  });
  await upsertAuthUser({
    uid: UID.parent2,
    phone: PHONE.parent2,
    displayName: 'Lakshmi Reddy',
    customClaims: { role: 'parent' },
  });

  const baseUser = {
    plan: 'free',
    consentedAt: now(),
    createdAt: now(),
    updatedAt: now(),
    preferences: { language: 'en', notifications: true, theme: 'light' },
  };

  await setDoc(`users/${UID.schoolAdmin}`, {
    id: UID.schoolAdmin,
    phone: PHONE.schoolAdmin,
    name: 'Priya Iyer',
    role: 'schoolAdmin',
    schoolId: SCHOOL_ID,
    kidIds: [],
    ...baseUser,
  });
  await setDoc(`users/${UID.teacher1}`, {
    id: UID.teacher1,
    phone: PHONE.teacher1,
    name: 'Anand Kumar',
    role: 'teacher',
    schoolId: SCHOOL_ID,
    kidIds: [],
    ...baseUser,
  });
  await setDoc(`users/${UID.teacher2}`, {
    id: UID.teacher2,
    phone: PHONE.teacher2,
    name: 'Meera Nair',
    role: 'teacher',
    schoolId: SCHOOL_ID,
    kidIds: [],
    ...baseUser,
  });
  await setDoc(`users/${UID.parent1}`, {
    id: UID.parent1,
    phone: PHONE.parent1,
    name: 'Rajesh Sharma',
    role: 'parent',
    kidIds: [KID.aarav],
    ...baseUser,
  });
  await setDoc(`users/${UID.parent2}`, {
    id: UID.parent2,
    phone: PHONE.parent2,
    name: 'Lakshmi Reddy',
    role: 'parent',
    kidIds: [KID.diya, KID.krish],
    ...baseUser,
  });
}

async function seedSchoolAndClasses() {
  log('seeding school + classes…');

  await setDoc(`schools/${SCHOOL_ID}`, {
    id: SCHOOL_ID,
    name: 'GSI Test School',
    city: 'Chennai',
    state: 'Tamil Nadu',
    board: 'cbse',
    schoolCode: 'GSITEST',
    adminUid: UID.schoolAdmin,
    teacherIds: [UID.schoolAdmin, UID.teacher1, UID.teacher2],
    studentCount: 4,
    plan: 'premium',
    branding: {
      primaryColor: '#5B5FFF',
      secondaryColor: '#20C997',
    },
    createdAt: now(),
    updatedAt: now(),
  });

  await setDoc(`schools/${SCHOOL_ID}/classes/${CLASS_6A_ID}`, {
    id: CLASS_6A_ID,
    schoolId: SCHOOL_ID,
    name: 'Class 6A',
    grade: '6',
    section: 'A',
    teacherUid: UID.teacher1,
    studentKidIds: [KID.aarav, KID.diya],
    inviteCode: 'TEST6A',
    createdAt: now(),
    updatedAt: now(),
  });

  await setDoc(`schools/${SCHOOL_ID}/classes/${CLASS_7B_ID}`, {
    id: CLASS_7B_ID,
    schoolId: SCHOOL_ID,
    name: 'Class 7B',
    grade: '7',
    section: 'B',
    teacherUid: UID.teacher2,
    studentKidIds: [KID.krish, KID.sneha],
    inviteCode: 'TEST7B',
    createdAt: now(),
    updatedAt: now(),
  });
}

async function seedKids() {
  log('seeding kids…');

  const baseKid = {
    verifiedBy: 'parent' as const,
    verifiedAt: now(),
    board: 'cbse' as const,
    badges: [],
    conceptsLearned: ['ai_intro', 'pattern_recognition'],
    shareCount: 0,
    streak: { current: 3, longest: 7, lastActiveDate: '2026-05-10' },
    createdAt: now(),
    updatedAt: now(),
  };

  await setDoc(`kids/${KID.aarav}`, {
    id: KID.aarav,
    email: 'aarav@test.gsi.ai',
    name: 'Aarav',
    age: 11,
    grade: '6',
    parentId: UID.parent1,
    schoolId: SCHOOL_ID,
    classIds: [CLASS_6A_ID],
    aiPoints: 120,
    totalCreations: 5,
    creationsByType: { story: 3, quiz: 1, comic: 1 },
    ...baseKid,
  });

  await setDoc(`kids/${KID.diya}`, {
    id: KID.diya,
    email: 'diya@test.gsi.ai',
    name: 'Diya',
    age: 11,
    grade: '6',
    parentId: UID.parent2,
    schoolId: SCHOOL_ID,
    classIds: [CLASS_6A_ID],
    aiPoints: 85,
    totalCreations: 3,
    creationsByType: { music: 2, story: 1 },
    ...baseKid,
  });

  await setDoc(`kids/${KID.krish}`, {
    id: KID.krish,
    email: 'krish@test.gsi.ai',
    name: 'Krish',
    age: 12,
    grade: '7',
    parentId: UID.parent2,
    schoolId: SCHOOL_ID,
    classIds: [CLASS_7B_ID],
    aiPoints: 200,
    totalCreations: 8,
    creationsByType: { game: 4, quiz: 2, comic: 2 },
    ...baseKid,
  });

  // Sneha is anonymous (no parentId) — covers the open-beta flow.
  await setDoc(`kids/${KID.sneha}`, {
    id: KID.sneha,
    email: 'sneha@test.gsi.ai',
    name: 'Sneha',
    age: 12,
    grade: '7',
    parentId: null,
    schoolId: SCHOOL_ID,
    classIds: [CLASS_7B_ID],
    aiPoints: 40,
    totalCreations: 1,
    creationsByType: { story: 1 },
    ...baseKid,
    verifiedBy: 'teacher' as const,
  });
}

async function seedConsents() {
  log('seeding DPDP consent records…');

  // Grant the standard scopes for kids with linked parents.
  const scopes = [
    'ai_generation',
    'data_storage',
    'parent_messaging',
    'peer_sharing',
    'analytics',
  ] as const;

  for (const [kidId, parentUid] of [
    [KID.aarav, UID.parent1] as const,
    [KID.diya, UID.parent2] as const,
    [KID.krish, UID.parent2] as const,
  ]) {
    for (const scope of scopes) {
      const id = `test_consent_${kidId}_${scope}`;
      await setDoc(`consents/${id}`, {
        id,
        parentUid,
        kidId,
        scope,
        granted: true,
        method: 'otp_affirmation',
        timestamp: now(),
      });
    }
  }

  // Krish — revoke peer_sharing to test the negative path.
  await setDoc(`consents/test_consent_${KID.krish}_peer_sharing_revoke`, {
    id: `test_consent_${KID.krish}_peer_sharing_revoke`,
    parentUid: UID.parent2,
    kidId: KID.krish,
    scope: 'peer_sharing',
    granted: false,
    method: 'revocation',
    timestamp: now(),
  });
}

async function seedChannelPrefs() {
  log('seeding parent channel preferences…');

  // Parent 1 — Telegram + email, both granted, Telegram preferred.
  await setDoc(`users/${UID.parent1}/channelPrefs/telegram`, {
    parentUid: UID.parent1,
    channel: 'telegram',
    handle: '12345678',
    consentStatus: 'granted',
    consentedAt: now(),
    locale: 'en',
  });
  await setDoc(`users/${UID.parent1}/channelPrefs/email`, {
    parentUid: UID.parent1,
    channel: 'email',
    handle: 'rajesh@test.gsi.ai',
    consentStatus: 'granted',
    consentedAt: now(),
    locale: 'en',
  });

  // Parent 2 — WhatsApp granted, email revoked (tests revoked path).
  await setDoc(`users/${UID.parent2}/channelPrefs/whatsapp`, {
    parentUid: UID.parent2,
    channel: 'whatsapp',
    handle: PHONE.parent2,
    consentStatus: 'granted',
    consentedAt: now(),
    locale: 'hi',
  });
  await setDoc(`users/${UID.parent2}/channelPrefs/email`, {
    parentUid: UID.parent2,
    channel: 'email',
    handle: 'lakshmi@test.gsi.ai',
    consentStatus: 'revoked',
    consentedAt: now(),
    revokedAt: now(),
    locale: 'en',
  });
}

async function seedAssignmentsAndSubmissions() {
  log('seeding assignments + submissions…');

  const due = new Date();
  due.setDate(due.getDate() + 7);

  await setDoc(`assignments/${ASSIGNMENT.story6a}`, {
    id: ASSIGNMENT.story6a,
    schoolId: SCHOOL_ID,
    classId: CLASS_6A_ID,
    teacherUid: UID.teacher1,
    title: 'Write a story about a friendly robot',
    description:
      'Compose a 5-page story with illustrations. Theme: empathy and friendship.',
    creationType: 'story',
    dueDate: Timestamp.fromDate(due),
    curriculumTags: ['ai-ct-empathy', 'ncert-class6-english-prose'],
    status: 'active',
    submissions: 1,
    createdAt: now(),
    updatedAt: now(),
  });

  await setDoc(`assignments/${ASSIGNMENT.quiz7b}`, {
    id: ASSIGNMENT.quiz7b,
    schoolId: SCHOOL_ID,
    classId: CLASS_7B_ID,
    teacherUid: UID.teacher2,
    title: 'Quiz: How does AI recognise images?',
    description: 'Build a 6-question quiz on AI image classification.',
    creationType: 'quiz',
    dueDate: Timestamp.fromDate(due),
    curriculumTags: ['ai-ct-image-recognition', 'ncert-class7-science-light'],
    status: 'active',
    submissions: 1,
    createdAt: now(),
    updatedAt: now(),
  });

  await setDoc(`submissions/${SUBMISSION.aaravStory}`, {
    id: SUBMISSION.aaravStory,
    assignmentId: ASSIGNMENT.story6a,
    classId: CLASS_6A_ID,
    schoolId: SCHOOL_ID,
    kidId: KID.aarav,
    creationId: CREATION.aaravStory,
    status: 'pending',
    sharedToClassFeed: false,
    submittedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  });

  await setDoc(`submissions/${SUBMISSION.krishQuiz}`, {
    id: SUBMISSION.krishQuiz,
    assignmentId: ASSIGNMENT.quiz7b,
    classId: CLASS_7B_ID,
    schoolId: SCHOOL_ID,
    kidId: KID.krish,
    creationId: CREATION.krishGame,
    status: 'approved',
    feedback: 'Great work — try varying your distractors next time!',
    starred: true,
    sharedToClassFeed: true,
    reviewedBy: UID.teacher2,
    reviewedAt: now(),
    submittedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  });
}

async function seedCreations() {
  log('seeding sample creations…');

  const baseCreation = {
    status: 'published' as const,
    createdAt: now(),
    updatedAt: now(),
    isPublic: false,
    aiPointsAwarded: 25,
  };

  await setDoc(`creations/${CREATION.aaravStory}`, {
    id: CREATION.aaravStory,
    kidId: KID.aarav,
    type: 'story',
    title: 'The Friendly Robot',
    content: {
      pages: [
        { pageNumber: 1, text: 'Once upon a time…', imageUrl: '' },
        { pageNumber: 2, text: 'The robot met a kid.', imageUrl: '' },
      ],
      genre: 'friendship',
      characters: ['Robot', 'Kid'],
      setting: 'A small village',
    },
    ...baseCreation,
  });

  await setDoc(`creations/${CREATION.diyaMusic}`, {
    id: CREATION.diyaMusic,
    kidId: KID.diya,
    type: 'music',
    title: 'Sunshine Beats',
    content: {
      duration: 60,
      genre: 'pop',
      mood: 'happy',
      lyrics: 'Sunshine on my mind…',
      instruments: ['piano', 'drums'],
      bpm: 110,
    },
    ...baseCreation,
  });

  await setDoc(`creations/${CREATION.krishGame}`, {
    id: CREATION.krishGame,
    kidId: KID.krish,
    type: 'game',
    title: 'Forest Quest',
    content: {
      title: 'Forest Quest',
      premise: 'A hero finds a magical key.',
      scenes: [],
    },
    ...baseCreation,
  });
}

async function seedNotifications() {
  log('seeding notifications…');

  const items: Array<{
    recipientUid: string;
    id: string;
    type: string;
    title: string;
    body: string;
    href?: string;
    readAt?: Date | null;
  }> = [
    {
      recipientUid: UID.parent1,
      id: 'test_notif_parent1_assignment',
      type: 'assignment_new',
      title: 'New assignment for Aarav',
      body: '"Write a story about a friendly robot" — due in 7 days.',
      href: '/parent/comms',
    },
    {
      recipientUid: UID.parent2,
      id: 'test_notif_parent2_feedback',
      type: 'teacher_feedback',
      title: 'Teacher feedback for Krish',
      body: 'Anand left feedback on Krish\'s quiz submission.',
      href: '/parent/comms',
    },
    {
      recipientUid: UID.teacher1,
      id: 'test_notif_teacher1_submission',
      type: 'submission_reviewed',
      title: 'New submission to review',
      body: 'Aarav submitted the friendly-robot story.',
      href: `/teacher/classes/${CLASS_6A_ID}/assignments/${ASSIGNMENT.story6a}`,
    },
    {
      recipientUid: UID.schoolAdmin,
      id: 'test_notif_admin_compliance',
      type: 'badge_earned',
      title: 'Weekly DPDP snapshot ready',
      body: 'Consent rate this week: 92%. 1 open data-rights request.',
      href: '/school/compliance',
    },
  ];

  for (const item of items) {
    await setDoc(`users/${item.recipientUid}/notifications/${item.id}`, {
      id: item.id,
      recipientUid: item.recipientUid,
      type: item.type,
      payload: { title: item.title, body: item.body, href: item.href },
      channels: ['in_app'],
      readAt: null,
      createdAt: now(),
    });
  }

  // Stamp unread counts on the user docs.
  await setDoc(`users/${UID.parent1}`, { unreadNotificationCount: 1 });
  await setDoc(`users/${UID.parent2}`, { unreadNotificationCount: 1 });
  await setDoc(`users/${UID.teacher1}`, { unreadNotificationCount: 1 });
  await setDoc(`users/${UID.schoolAdmin}`, { unreadNotificationCount: 1 });
}

async function seedPtmNotes() {
  log('seeding PTM notes…');

  await setDoc(`ptmNotes/${PTM_NOTE_DRAFT}`, {
    id: PTM_NOTE_DRAFT,
    schoolId: SCHOOL_ID,
    classId: CLASS_6A_ID,
    kidId: KID.aarav,
    authorUid: UID.teacher1,
    term: 'Term 1',
    body: 'Aarav has shown strong creative writing skills this term. Working on collaboration during group activities.',
    status: 'draft',
    sentAt: null,
    createdAt: now(),
    updatedAt: now(),
  });

  await setDoc(`ptmNotes/${PTM_NOTE_SENT}`, {
    id: PTM_NOTE_SENT,
    schoolId: SCHOOL_ID,
    classId: CLASS_6A_ID,
    kidId: KID.diya,
    authorUid: UID.teacher1,
    term: 'Term 1',
    body: 'Diya leads in music — exceptional rhythm and creativity. Discussed continuing piano practice at home.',
    status: 'sent',
    sentAt: now(),
    createdAt: now(),
    updatedAt: now(),
  });
}

async function seedCommsLog() {
  log('seeding commsLog (digest + ad-hoc history)…');

  const entries = [
    {
      id: 'test_commslog_digest_aarav',
      recipientUid: UID.parent1,
      kidId: KID.aarav,
      channel: 'telegram',
      templateId: 'parent_weekly_digest_v1',
      messageId: 'tg_msg_1',
      status: 'delivered',
      error: null,
    },
    {
      id: 'test_commslog_digest_diya',
      recipientUid: UID.parent2,
      kidId: KID.diya,
      channel: 'whatsapp',
      templateId: 'parent_weekly_digest_v1',
      messageId: null,
      status: 'pending',
      error: null,
    },
    {
      id: 'test_commslog_digest_krish_failed',
      recipientUid: UID.parent2,
      kidId: KID.krish,
      channel: 'whatsapp',
      templateId: 'parent_weekly_digest_v1',
      messageId: null,
      status: 'failed',
      error: 'WhatsApp template not approved for region.',
    },
    {
      id: 'test_commslog_adhoc_aarav',
      recipientUid: UID.parent1,
      kidId: KID.aarav,
      channel: 'telegram',
      templateId: 'adhoc_v1',
      messageId: 'tg_msg_2',
      status: 'delivered',
      error: null,
    },
  ];

  for (const e of entries) {
    await setDoc(`commsLog/${e.id}`, {
      ...e,
      sentAt: now(),
    });
  }
}

async function seedSisIntegration() {
  log('seeding SIS integration config (Local provider, enabled)…');

  await setDoc(`erpIntegrations/${SCHOOL_ID}`, {
    provider: 'local',
    enabled: true,
    credentialsRef: null,
    updatedAt: now(),
  });
}

async function reset() {
  log('--reset: deleting seeded test data…');
  if (DRY_RUN) {
    log('(dry run — skipping deletes)');
    return;
  }

  // Auth users
  for (const uid of Object.values(UID)) {
    try {
      await adminAuth.deleteUser(uid);
    } catch {
      /* fine if missing */
    }
  }

  // Top-level collections — id-prefixed
  const collections = [
    'users',
    'kids',
    'consents',
    'assignments',
    'submissions',
    'creations',
    'ptmNotes',
    'commsLog',
  ];
  let total = 0;
  for (const c of collections) {
    total += await deletePrefix(c, 'test_');
  }

  // Nested channel prefs
  for (const uid of [UID.parent1, UID.parent2]) {
    const snap = await adminDb.collection(`users/${uid}/channelPrefs`).get();
    for (const d of snap.docs) {
      await d.ref.delete();
      total += 1;
    }
    const notifSnap = await adminDb.collection(`users/${uid}/notifications`).get();
    for (const d of notifSnap.docs) {
      await d.ref.delete();
      total += 1;
    }
  }
  for (const uid of [UID.teacher1, UID.teacher2, UID.schoolAdmin]) {
    const notifSnap = await adminDb.collection(`users/${uid}/notifications`).get();
    for (const d of notifSnap.docs) {
      await d.ref.delete();
      total += 1;
    }
  }

  // School + classes
  total += await deleteWhere('schools', '__name__', '==', SCHOOL_ID);
  const classesSnap = await adminDb.collection(`schools/${SCHOOL_ID}/classes`).get();
  for (const d of classesSnap.docs) {
    await d.ref.delete();
    total += 1;
  }

  // SIS
  try {
    await adminDb.collection('erpIntegrations').doc(SCHOOL_ID).delete();
    total += 1;
  } catch {
    /* fine */
  }

  log(`reset complete: removed ${total} Firestore docs + ${Object.values(UID).length} auth users.`);
}

// ─── Entry point ──────────────────────────────────────────────────────────

async function main() {
  log(`target: ${USING_EMULATOR ? 'FIREBASE EMULATOR' : `LIVE project "${PROJECT_ID}"`}`);
  if (!USING_EMULATOR && !process.env.SEED_ALLOW_LIVE) {
    log('refusing to seed a live Firebase project without SEED_ALLOW_LIVE=1.');
    log('hint: set FIRESTORE_EMULATOR_HOST + FIREBASE_AUTH_EMULATOR_HOST,');
    log('      or export SEED_ALLOW_LIVE=1 if you really mean it.');
    process.exit(2);
  }
  if (DRY_RUN) log('(dry run — no writes)');

  // Touch FieldValue.serverTimestamp so the import isn't lint-flagged on the
  // happy path; downstream code may swap to it for stricter ordering.
  void FieldValue.serverTimestamp;

  if (RESET) {
    await reset();
    log('--reset done; re-seeding…');
  }

  await seedAuthAndUsers();
  await seedSchoolAndClasses();
  await seedKids();
  await seedConsents();
  await seedChannelPrefs();
  await seedAssignmentsAndSubmissions();
  await seedCreations();
  await seedNotifications();
  await seedPtmNotes();
  await seedCommsLog();
  await seedSisIntegration();

  log('done.');
  log('');
  log('Test accounts (phone OTP — emulator accepts any 6-digit code):');
  log(`  School admin  : ${PHONE.schoolAdmin}   → /school`);
  log(`  Teacher (6A)  : ${PHONE.teacher1}   → /teacher`);
  log(`  Teacher (7B)  : ${PHONE.teacher2}   → /teacher`);
  log(`  Parent (Aarav): ${PHONE.parent1}   → /parent/settings/data-rights`);
  log(`  Parent (Diya+Krish): ${PHONE.parent2}   → /parent/settings/data-rights`);
  log('');
  log('Kid profiles (anonymous open beta or via parent picker):');
  log(`  Aarav (Class 6A, parent Rajesh, consent ✓)`);
  log(`  Diya  (Class 6A, parent Lakshmi, consent ✓)`);
  log(`  Krish (Class 7B, parent Lakshmi, consent ✓ except peer_sharing)`);
  log(`  Sneha (Class 7B, no parent — open beta)`);
  log('');
  log('Re-run with --reset to wipe and reseed. --dry-run to preview.');
}

main().catch((err) => {
  console.error('[seed] FAILED:', err);
  process.exit(1);
});
