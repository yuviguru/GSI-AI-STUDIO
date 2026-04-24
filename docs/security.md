# GSI AI Studio — Security

## Overview

GSI AI Studio handles children's data, making security and privacy non-negotiable. The platform must comply with India's Digital Personal Data Protection Act (DPDPA) 2023 which has specific provisions for children's data, and follow COPPA principles for international best practice.

**Core Principle**: Collect minimum data, protect everything collected, and never expose children to unsafe AI content.

## Authentication

### Phase 1: Anonymous Sessions
No authentication required. Users identified by:
- Session ID (UUID v4, stored in localStorage)
- Browser fingerprint hash (for abuse prevention only, not tracking)

```
Kid opens site → Generate session UUID → Store in localStorage
                                       → Create session doc in Firestore
```

Session limits:
- 5 creations per session per 24 hours
- 2-minute cooldown between creations
- Sessions expire after 24 hours of inactivity

### Phase 2: Phone OTP Authentication

**Provider**: Firebase Authentication (Phone Auth)

**Auth Flow**:
```
┌─────────┐    phone number    ┌──────────────┐    send OTP    ┌─────────┐
│ Parent   │──────────────────▶│  Firebase     │──────────────▶│  SMS    │
│ (Client) │                   │  Auth SDK     │               │ Gateway │
│          │◀──────────────────│              │◀──────────────│         │
│          │   verificationId  │              │   OTP sent    │         │
└─────────┘                    └──────────────┘               └─────────┘
     │
     │ enter OTP
     ▼
┌─────────┐    verify OTP      ┌──────────────┐
│ Parent   │──────────────────▶│  Firebase     │
│ (Client) │◀──────────────────│  Auth         │
│          │   ID Token +      │              │
│          │   Refresh Token   │              │
└─────────┘                    └──────────────┘
     │
     │ ID Token in header
     ▼
┌─────────────────┐    verify token    ┌──────────────┐
│ Next.js API Route │──────────────────▶│ Firebase     │
│ (Server)         │◀──────────────────│ Admin SDK    │
│                  │   decoded user    │              │
└─────────────────┘                    └──────────────┘
```

**Token Handling**:
- Firebase manages token lifecycle automatically
- ID tokens: 1 hour (auto-refreshed by Firebase SDK)
- Refresh tokens: persistent (until sign-out or revocation)
- Tokens stored by Firebase SDK internally (not in localStorage manually)

### Client-Side Auth

```typescript
// lib/firebase/auth.ts
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth'

// Send OTP
const auth = getAuth()
const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)

// Verify OTP
const result = await confirmation.confirm(otpCode)
const idToken = await result.user.getIdToken()

// Check auth state
const user = auth.currentUser
const isAuthenticated = !!user
```

### Server-Side Validation

```typescript
// lib/firebase/admin.ts
import { getAuth } from 'firebase-admin/auth'

async function verifyAuth(request: NextRequest): Promise<DecodedIdToken> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) throw new AppException('UNAUTHORIZED', 'Missing auth token', 401)

  try {
    return await getAuth().verifyIdToken(token)
  } catch {
    throw new AppException('UNAUTHORIZED', 'Invalid auth token', 401)
  }
}
```

### Bot Auth Binding Security

When a kid links a Telegram chat to their GSI identity, we issue a short-lived, single-use token (deep link) that binds `chatId → (gsiSessionId, userId?, kidId?)`. This flow must resist forgery, replay, and confused-deputy attacks across the two bots.

- **Link token properties**: `botLinkCodes` stores 32-byte hex tokens generated via `crypto.randomBytes(16).toString('hex')`. Single-use (flipped `used: true` on redemption). 10-minute TTL. Bot-scoped (a `@GSIKidCeoAssistantBot` token cannot be redeemed in `@GSIPersonalAssistantBot`).
- **6-digit code fallback**: When the deep link fails (e.g. mobile app intents block the handoff), a numeric 6-digit code is also stored in the same `botLinkCodes` doc (or a parallel field). Kid types `/link 123456` in the bot. Same validation.
- **Server-write-only**: `botLinkCodes` is server-write-only via Admin SDK — clients cannot forge tokens directly.
- **Audit field**: `usedByChatId` is recorded on redemption for incident investigation.
- **TTL cleanup**: Firestore TTL policy deletes expired docs 24 hours after `expiresAt`. No manual cleanup needed.
- **Confused-deputy resistance**: A token minted for bot A cannot bind a chat on bot B. The bot webhook handler reads `botLinkCodes.botHandle` and rejects tokens that don't match its own handle.
- **Anonymous users**: If the kid hasn't completed Firebase Phone Auth yet, the link token binds the `gsiSessionId` only (`userId` and `kidId` are null). Upgrade happens on the next auth event.

---

## Authorization

### Role-Based Access

| Role | Scope | Permissions |
|------|-------|-------------|
| anonymous | Session | Create (limited), view public creations |
| parent | Account | Manage kids, view kid creations, billing |
| kid | Profile | Create, view own creations, participate in challenges |
| teacher | School | View class creations, create assignments, view reports |
| school_admin | School | Manage teachers, school settings, billing |
| platform_admin | Global | All permissions |

### Resource Ownership
- **Creations**: Owned by kid profile (Phase 2) or session (Phase 1)
- **Kid profiles**: Owned by parent account
- **School data**: Scoped to school document

```typescript
// Verify creation ownership
async function verifyCreationOwner(creationId: string, userId: string, kidId?: string) {
  const creation = await getCreation(creationId)
  if (creation.userId !== userId) throw new AppException('FORBIDDEN', 'Not your creation', 403)
  if (kidId && creation.kidId !== kidId) throw new AppException('FORBIDDEN', 'Not your creation', 403)
}
```

### Firestore Security Rules

Phase 1 uses **server-side only writes** via Firebase Admin SDK for all collections. Client-side writes are disabled. The actual deployed `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Creations: public read for published, server-side write only
    match /creations/{creationId} {
      allow read: if resource.data.isPublic == true || resource.data.status == 'published';
      allow write: if false; // Server-side only via Admin SDK
    }

    // Sessions: rate limiting — server-side only
    match /sessions/{sessionId} {
      allow read, write: if false; // Server-side only via Admin SDK
    }

    // Users (Phase 2+): owner read only, server-side write
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Server-side only

      match /kids/{kidId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if false;
      }
    }

    // Curriculum: public read, no client write
    match /curriculum/{topicId} {
      allow read: if true;
      allow write: if false;
    }

    // Beat the AI rounds: server-side only
    match /beatTheAiRounds/{roundId} {
      allow read, write: if false;
    }

    // MindX assessments: server-side only
    match /skillArenaAssessments/{assessmentId} {
      allow read, write: if false;
    }

    // Kid CEO business simulation — server-side only
    match /ceoBusiness/{businessId} {
      allow read, write: if false;
    }
    match /ceoEvents/{eventId} {
      allow read, write: if false;
    }
    // CEO profile: public read when isPublic == true (shareable DNA Card)
    match /ceoProfiles/{profileId} {
      allow read: if resource.data.isPublic == true;
      allow write: if false;
    }

    // Bot infrastructure — server-side only
    match /botSessions/{chatId} {
      allow read, write: if false;
    }
    match /botLinkCodes/{token} {
      allow read, write: if false;
    }
    match /homeworkSessions/{id} {
      allow read, write: if false;
    }

    // Cerebro competitions (Phase 2+): public read
    match /competitions/{competitionId} {
      allow read: if true;
      allow write: if false;
    }

    // Cerebro exam sessions (Phase 2+): server-side only
    match /examSessions/{examSessionId} {
      allow read, write: if false;
    }

    // Cerebro leaderboards (Phase 2+): public read
    match /leaderboards/{leaderboardId} {
      allow read: if true;
      allow write: if false;
    }

    // GrowthMap reports (Phase 2+): parent reads own kids' reports
    match /growthMapReports/{reportId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false;
    }

    // Challenges (Phase 2+): public read
    match /challenges/{challengeId} {
      allow read: if true;
      allow write: if false;
    }

    // Schools (Phase 3): authenticated read
    match /schools/{schoolId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // Default: deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Note: `firestore.rules` is the deployed source of truth — these examples must stay in sync with that file.

---

## AI Content Safety

### Child Safety is the #1 Priority

All AI-generated content must be safe for children ages 8-17. This is enforced at multiple layers.

### Input Safety Pipeline

```
User Input → [1. Client-side blocklist] → [2. Server profanity filter] → [3. Claude safety prompt] → AI Generation
```

1. **Server blocklist** (`lib/safety/blocklist.ts`): 28 regex patterns covering violence, sexual content, substances, self-harm, hate speech, and PII requests. Case-insensitive word-boundary matching. Rejects request with `UNSAFE_CONTENT` error and kid-friendly message.
2. **Input validation** (`lib/safety/inputFilter.ts → filterInput()`): Minimum 3-char length check + blocklist scan. Throws `AppException('UNSAFE_CONTENT')`.
3. **Claude safety prompt**: System prompt instructs Claude to refuse inappropriate requests and generate only child-safe content.

### Output Safety Pipeline

```
AI Output → [4. Content classifier] → [5. PII detection] → [6. Image NSFW check] → User
```

4. **PII redaction** (`lib/safety/inputFilter.ts → filterOutput()`): Regex scan for 10-digit phone numbers, emails, physical addresses, and 12-digit Aadhaar numbers. Replaces matches with `[REDACTED]`.
5. **Image prompt filter** (`lib/safety/inputFilter.ts → filterImagePrompt()`): 14 unsafe keywords (gun, weapon, knife, blood, gore, nude, naked, sexy, drug, alcohol, cigarette, smoking, kill, death). Throws on match.
6. **Image NSFW check**: Replicate's built-in safety filter (enabled by default) + forced illustration/cartoon style

### Claude System Prompt Safety Rules

```
All content must be:
- Appropriate for children ages 8-17
- Free of violence, weapons, gore
- Free of sexual content or innuendo
- Free of discrimination, bullying, or hate speech
- Free of drug, alcohol, or substance references
- Free of personal information (real names, addresses, phone numbers)
- Positive, educational, and encouraging
- Culturally sensitive to Indian context

If a user's request could lead to inappropriate content, redirect creatively:
- "A story about war" → Focus on friendship and peace
- "Scary monster" → Make the monster friendly and misunderstood
```

### Beat the AI Safety

Beat the AI involves **kid-authored free text** (not just prompts to AI), requiring additional safety:

- **Kid input filter**: Same profanity/safety filter as AI prompts. Kid's typed response is scanned before saving to Firestore. If flagged, show: "Let's keep it fun and friendly! Try writing something different."
- **AI opponent response filter**: AI-generated response goes through standard output safety pipeline
- **No kid-to-kid exposure (Phase 1)**: Rounds are private to the session. No public display of kid-authored text
- **Rate limiting**: 5 Beat the AI rounds per session per day (shares the daily creation limit)
- **Timer abuse**: Server validates round duration (must be ≥10 seconds, ≤ timeLimit + 30s buffer)
- **Score manipulation**: Scores are self-reported (Phase 1). Server validates range (1-5 integers only). Phase 2 adds peer voting
- **Prompt bank safety**: All prompts are pre-curated and reviewed. No user-generated prompts

### MindX Safety

MindX involves **voice input** (speaking module) and **free text answers** (thinking/reading modules), requiring additional safety:

- **Voice input safety**: Speech-to-text transcripts go through same profanity/safety filter as text input. If flagged, show: "Let's keep our answers clean and thoughtful!"
- **Answer text filter**: Free-text answers (describe, what-if, summarize) are scanned before sending to AI evaluator
- **AI evaluation safety**: Claude evaluation prompts include child-safety instructions. Feedback must be encouraging, never harsh or discouraging
- **Mic permission**: Graceful handling — if denied, fallback to text input. Never re-prompt aggressively
- **No voice storage**: Voice audio is NOT stored. Only the speech-to-text transcript is saved. Audio is processed client-side via Web Speech API
- **Rate limiting**: 3 MindX assessments per session per day
- **Question bank safety**: All challenge content (passages, questions, scenarios) is pre-curated. India-culturally-relevant and age-appropriate
- **Score integrity**: AI evaluation is server-side (not self-reported like Beat the AI). No score manipulation possible
- **Mentor feedback tone**: Claude system prompt enforces positive, encouraging feedback. Never uses words like "wrong", "bad", "failed" — uses "keep growing", "next time try", "almost there"

### Kid CEO Safety

Kid CEO is a business-simulation feature ported from SimPrenuer. It combines kid-authored free text, LLM-generated event scenarios, and decision scoring — all of which need kid-safe treatment:

- **Age target**: 10+ only in v1. No 8-10 simplified variant — prompts, scenarios, and language are calibrated to a 10+ reading level and life experience.
- **Business name + custom description filtering**: Kid-authored free text (business name, `custom` business description) passes through `lib/safety/inputFilter.ts` before saving. Rejected with `UNSAFE_CONTENT` if flagged.
- **Event generation safety**: LLM system prompt for event generation enforces: no violence, no adult financial concepts (loans to family, gambling, lottery), no discrimination scenarios, no political/religious content, no real brand names (avoid trademark issues), culturally grounded but non-stereotyping.
- **Scoring safety**: Decision scoring prompt never frames any choice as "wrong" or "bad" — all 3 choices have defensible rationale, aligning with existing anti-gaming design. Feedback language avoids negative affect words ("failed", "lost", "mistake"); uses growth-oriented language ("learning", "next time", "adjust").
- **Event template fallbacks**: If the LLM refuses or generates unsafe content, fall back to a pre-curated kid-safe event template pool (see `lib/ceo/templates/events.json`). Templates are reviewed manually.
- **PII in event text**: Event descriptions may reference characters (friends, family). All LLM-generated event text passes `filterOutput()` for PII redaction (phones, emails, addresses) before save.
- **Rate limiting + cooldown**: 3 business registrations per session per day; 50 events and 50 decisions per day per session (shared across web + bot channels by `sessionId`).
- **No kid-to-kid exposure in Phase 1**: Kid CEO profiles are private by default. `isPublic` flag only flips true when the kid explicitly taps "Share". Even public profiles show display names only (no real names).

### Telegram Bot Safety

GSI ships two bots (`@GSIPersonalAssistantBot` and `@GSIKidCeoAssistantBot`) that share the `lib/bot/` infrastructure. All bot traffic is treated as untrusted user input and routed through the same safety pipeline as web:

- **Two bots, same safety pipeline**: `@GSIPersonalAssistantBot` and `@GSIKidCeoAssistantBot` both route all inbound text, voice, document, and forwarded messages through the existing `lib/safety/inputFilter.ts`.
- **Forwarded message safety (Homework module)**: Forwarded content (text/image/PDF/voice) is treated as potentially arbitrary. Image/PDF OCR output + voice STT transcripts go through `filterInput()` before being passed to the LLM parser.
- **Voice message handling**: Voice audio is downloaded transiently for STT (Groq Whisper), transcribed, then discarded — **voice audio is never stored**. Only the transcript is saved (and filtered).
- **Outbound message safety**: All bot-sent messages originate from server-side code in `lib/bot/modules/*.ts`. LLM-generated feedback (recitation scoring, quiz explanation, CEO event feedback) passes through `filterOutput()` before being sent to Telegram.
- **Bot input rate limiting**: Per-chat rate limit of 30 messages/min (abuse prevention); 5 homework forwards per hour per chat; **5 homework forwards per hour per kid** once a `kidId` is bound to the chat (so two siblings sharing a parent's phone don't throttle each other); CEO decision rate shares with web (50/day per session).
- **Forwarded homework content retention**: `homeworkSessions.originalText` contains teacher-authored material (copyright belongs to the school/teacher). We store it only as long as the interactive session needs it for context. Retention is capped at **90 days** alongside the bot transcript policy; completed sessions older than 90 days are trimmed — progress/score are retained (aggregate), but `originalText` is cleared to null. Parents can request earlier erasure via the DPDPA data-deletion flow.
- **No cross-chat data leakage**: A module instance only sees its own `BotContext` — no global state shared across chats. `botSessions/{chatId}` is the only per-chat persistence.
- **Module scope**: The `ceo` module is NOT registered in `@GSIPersonalAssistantBot` and the `homework` module is NOT registered in `@GSIKidCeoAssistantBot`. Each bot's router rejects unknown commands with a help message.

### GrowthMap Parent Data Access (Phase 2+)

GrowthMap gives parents visibility into their child's learning data. Strict access controls protect child privacy:

- **Parent-only access**: Only the authenticated parent linked to a kid profile can view that child's GrowthMap data
- **No cross-family access**: Parent A cannot view Parent B's child's data, even if they know the kidId
- **Server-side aggregation**: Raw data (individual answers, voice transcripts, proctoring events) is NEVER exposed to the parent dashboard. Only aggregated scores, bands, and AI-generated summaries
- **Peer comparison opt-in**: Anonymized percentile rankings are OPT-IN only. Default is OFF. Parents explicitly consent via settings
- **AI report safety**: Koko's Report is generated via Claude with strict system prompt:
  - Never negative about the child
  - Never diagnostic (no "your child may have..." medical/psychological claims)
  - Never comparative in specific terms ("better than Priya")
  - Focus on growth, encouragement, and actionable tips
  - Disclaimer: "This is an AI-generated insight, not a professional assessment"
- **Data retention**: Reports older than 12 months are archived. Parents can request full data export or deletion (DPDPA compliance)
- **No third-party sharing**: GrowthMap data is never shared with schools, advertisers, or third parties unless parent explicitly consents
- **Interest signals disclaimer**: "Interest signals are AI-detected patterns based on creation themes. They are not career advice or psychological profiles."

### Cerebro Anti-Malpractice (Phase 2+)

Cerebro involves **competitive exams with prizes**, making anti-malpractice the #1 security priority:

#### Layer 1: Browser Lockdown (Client-Side)
- **Full-screen enforcement**: Exam requires fullscreen mode. Exit fullscreen = warning. 3 exits = auto-submit
- **Tab switch detection**: Page Visibility API logs every focus loss with timestamp. 3 tab switches = auto-submit
- **Clipboard blocking**: `copy`, `cut`, `paste` events prevented via `event.preventDefault()`
- **Right-click & DevTools**: Context menu disabled, F12/Ctrl+Shift+I detected via key events + `window.outerWidth` discrepancy
- **Window resize detection**: Flags potential screen sharing or side-by-side browsing
- **Keyboard shortcuts**: Block Ctrl+C, Ctrl+V, Ctrl+A during exam

#### Layer 2: AI-Powered Anomaly Detection (Server-Side)
- **Response time analysis**: Flag answers completed in < 3s for MCQ, < 10s for creative questions
- **Answer pattern similarity**: After exam window closes, compute cosine similarity between all participant answer vectors. Flag pairs with > 0.85 similarity across 5+ questions
- **Score-speed mismatch**: Perfect score + fastest time = auto-flag for manual review
- **Typing cadence**: For text answers, detect paste patterns (0ms between characters vs natural 50-200ms gaps)
- **IP/device clustering**: Flag multiple examSessionIds from same IP or device fingerprint
- **Score consistency**: 3x improvement between rounds without proportional time investment = flag
- **Geographic anomaly**: Registered school location vs IP geolocation mismatch = flag

#### Layer 3: Procedural Safeguards
- **Question bank size**: 200+ questions per category per age group. Each exam randomly selects 20-30
- **Full randomization**: Question order, MCQ option order shuffled per participant
- **Scheduled exam windows**: All participants in same time slot (reduces answer sharing)
- **No retakes**: One attempt per round per competition
- **Progressive proctoring**: Prelims = browser lockdown. Semis = + anomaly detection. Finals = + webcam proctoring
- **Webcam proctoring (Finals)**: Face detection (must see one face), multiple face detection (flag if 2+ faces), basic gaze tracking

#### Flag & Review System
- **Green**: No anomalies — auto-approved for leaderboard
- **Yellow**: 1-2 minor flags (1 tab switch, 1 fast answer) — auto-approved but logged
- **Orange**: 3+ flags — held from leaderboard until admin review
- **Red**: Critical flags (high similarity, webcam violation, device clustering) — auto-suspended, requires manual admin review + school coordinator confirmation

#### Prize Winner Verification
- Top 10 at each level: automatic response pattern review by anomaly detector
- Top 3 prize winners: mandatory manual review + school coordinator identity confirmation
- Prize eligibility: verified school + parent consent + consistent performance + clean proctoring record
- Disqualification: Clear evidence of cheating results in competition ban

#### Data Privacy for Competitions
- Leaderboards show display names only (not full names)
- School names visible only at school level and above (not to strangers)
- Proctoring data (webcam feeds) are NOT stored — only events/flags are logged
- IP addresses are hashed — raw IPs never stored
- Typing cadence data deleted 30 days after competition ends

### Image Generation Safety

- Use Replicate's built-in NSFW filter (enabled by default)
- Append safety keywords to all image prompts: "child-friendly, colorful, safe for children, illustration style"
- Negative prompts: "violence, weapons, blood, scary, realistic human faces, nudity"
- Style constraint: Force illustration/cartoon styles (never photorealistic)
- Post-generation: Log all image prompts for audit

---

## Data Protection

### Children's Data (DPDPA Compliance)

India's DPDPA 2023 classifies children (under 18) as requiring enhanced protection:

- **Verifiable parental consent**: Required before collecting any child's personal data (Phase 2 — parent creates account, adds kid)
- **Data minimization**: Collect only what's needed for the service
- **No behavioral tracking**: Don't track children for advertising or profiling
- **No targeted advertising**: Never show ads based on child's data
- **Right to erasure**: Parents can delete all child data on request
- **Data processing purpose**: Only for providing the educational service

### What We Collect

| Data | Phase 1 | Phase 2 | Purpose | Retention |
|------|---------|---------|---------|-----------|
| Session ID | ✅ | ❌ | Rate limiting | 24 hours |
| Browser fingerprint hash | ✅ | ❌ | Abuse prevention | 24 hours |
| Creation content | ✅ | ✅ | Core service | Until deleted |
| Phone number | ❌ | ✅ (parent) | Authentication | Until account deleted |
| Parent name | ❌ | ✅ | Account management | Until account deleted |
| Kid name | ❌ | ✅ | Profile display | Until account deleted |
| Kid age/grade | ❌ | ✅ | Content calibration | Until account deleted |
| AI prompts | ✅ | ✅ | Safety audit trail | 90 days |
| Payment data | ❌ | ✅ | Billing (via Razorpay) | Per Razorpay policy |
| Telegram chat ID | ❌ | ✅ | Bot session binding | Until unlinked or account deleted |
| Bot message transcripts (text + STT) | ❌ | ✅ | Homework interactivity, safety audit | 90 days |
| Kid CEO decisions + event history | ✅ | ✅ | Core service (profile generation) | Until deleted |
| Voice audio (forwarded/recitation) | ❌ | ❌ | — | **Never stored — discarded after STT** |

### What We Never Collect
- Real names of children (display names only, can be fictional)
- Photos of children
- Location data (GPS)
- School name (unless school account, Phase 3)
- Contact information of children
- Browsing history or cross-site tracking
- Telegram user's phone number (we never call `getContact`)

### Sensitive Data Handling

**Never log**: Raw phone numbers, full Firebase tokens, payment details, IP addresses
**Always hash**: Session fingerprints, IP addresses (for rate limiting only)
**Always encrypt**: Data in transit (HTTPS enforced), data at rest (Firebase default encryption)

---

## API Security

### Rate Limiting

| Endpoint | Anonymous | Free User | Paid User |
|----------|-----------|-----------|-----------|
| AI Generation | 5/day, 1/2min cooldown | 5/week | Unlimited |
| Creation Save | 5/day | 10/week | Unlimited |
| Auth (OTP) | N/A | 5/min | 5/min |
| Beat the AI | 5/day | 5/week | Unlimited |
| MindX | 3/day | 5/week | Unlimited |
| Kid CEO Register | 3/day | 3/week | Unlimited |
| Kid CEO Event Generate | 50/day | 50/day | 50/day |
| Kid CEO Decide | 50/day | 50/day | 50/day |
| Bot Link Create | 5/hour | 5/hour | 5/hour |
| Bot Inbound Messages | 30/min/chat | 30/min/chat | 30/min/chat |
| Homework Forwards | 5/hour/chat | 5/hour/chat | 5/hour/chat |
| Cerebro Exam | N/A | 1/exam window | 1/exam window |
| Cerebro Submit | N/A | 30/min (per-question) | 30/min |
| GrowthMap Dashboard | N/A | 10/hour | 10/hour |
| GrowthMap Report | N/A | 3/day | 3/day |
| Public Read | 100/min | 100/min | 100/min |

Implementation: Firestore-based counter per session/user + Netlify rate limiting headers.

### CORS

```typescript
// next.config.js headers
{
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
    ? 'https://gsiaistudio.com'
    : 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Id'
}
```

### API Key Protection
- All AI service API keys stored in Netlify environment variables
- Never exposed to client-side code
- All AI calls proxied through Next.js API Routes
- Firebase Admin SDK credentials in Netlify env vars

### Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; img-src 'self' https://storage.googleapis.com; ...
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Secrets Management

- Never commit secrets to git
- Use `.env.local` for development (in `.gitignore`)
- Production secrets in Netlify dashboard (Environment Variables)
- Firebase service account key: stored as Netlify env var (base64 encoded)
- Rotate API keys quarterly
- Separate keys for dev/staging/production

```bash
# .env.local (never commit)
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_TOKEN=r8_...
SUNO_API_KEY=...
FIREBASE_SERVICE_ACCOUNT=<base64-encoded-json>
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_FIREBASE_CONFIG=<json>  # This one is public (client-side)
```

---

## Role Enforcement (Phase 3+)

School-side features (`/teacher/*`, `/school/*`) and their API routes (`/api/schools/*`, `/api/classes/*`, `/api/assignments/*`, `/api/admin/*`) must verify the caller's role before allowing access. Roles live on the Firestore user document (`users/{uid}.role`), not in Firebase custom claims — this avoids token-refresh coordination when a role changes.

### Canonical server pattern

```typescript
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { apiSuccess, handleApiError } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Verifies Bearer token, loads users/{uid}, asserts role.
    // Returns AuthContext { userId, role, plan, schoolId }.
    const auth = await requireRole(req, ['teacher', 'schoolAdmin']);
    // ... handler logic, scoped to auth.schoolId
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Rules

- **Never trust `role` from the client** — always re-derive it inside `requireRole`.
- **School admins can do everything teachers can** — treat the allow-list `['teacher', 'schoolAdmin']` as the default for teacher-flavoured endpoints.
- **Analytics endpoints are `schoolAdmin`-only** — heatmap, inter-school leaderboard, compliance export.
- **Never expose another school's data** — every query must filter by `auth.schoolId` derived from the user doc, never from request params.
- **Role upgrade happens only in `POST /api/auth/teacher/register`** — it's the single source of truth that writes `role: 'teacher'` and `schoolId` to the user doc. All other endpoints read role, never write it.
- **Firestore rules stay locked to `allow write: if false`** for `schools`, `classes`, `assignments`, `submissions`, and `schoolAnalytics`. All writes flow through the Admin SDK in server routes.

---

## Kid CEO Agents (Phase 3)

### Brief-input + artifact-output filtering

Every agent briefing field (mood, audience, free-text) passes through `filterInput()` from `lib/safety/inputFilter.ts` before reaching the LLM. Free-text fields are additionally capped at agent-specific lengths (Design Agent: 20 chars for the "one word" field; Marketing Agent: 25 chars for "hook"; etc.) to bound both PII exposure and prompt-injection surface.

Every artifact asset — text (mottos, voice, checklists, posts) and image captions/altText — passes through `filterOutput()` before landing in `ceoArtifacts`. Images themselves are generated by trusted providers (Flux Schnell, SDXL, Pollinations) and hosted on our existing image-provider pipeline; no kid-controlled URLs ever reach the `url` field of an asset.

### Custom workflows (Scratch-style builder)

- Trigger and tool vocabularies are **closed enums** — saved specs referencing unknown IDs are rejected at validation time. No free-form code execution.
- Custom-workflow prompts pass through `filterInput()` on save and `filterOutput()` on every run.
- The executor is the same one the built-in workflows use — there is no separate runtime surface to harden.

### Agent hire ownership

`POST /api/ceo/agents/*` endpoints all validate that the target `businessId` belongs to the active kid (`requireAuthWithKid` + explicit `business.kidId` check). A leaked `hireId` or `artifactId` cannot be used to run or accept on another kid's business.

## Learn (AI Lab, Phase 3)

### Iframe sandbox + CSP allowlist

Try-It embeds (Hugging Face Spaces + other curated demos) render inside `<iframe sandbox="allow-scripts allow-same-origin">`. The set of permitted origins is hardcoded in `next.config.js` as a CSP `frame-src` allowlist — anything outside the list fails to load, even if a registry entry pointed there. The `EMBED_REGISTRY` in `lib/learn/embeds.ts` is the single source of truth for what's offered; the CSP enforces it as defence in depth.

### Transformers.js isolation

Models downloaded by `@xenova/transformers` are cached by the library in IndexedDB under the current origin. No cross-origin fetches are issued beyond the pinned HF Hub revision URLs. Initial model download is size-gated (hint shown to kid before a > 50 MB download starts) to avoid bandwidth shock on low-end mobile.

### Workshop artifacts

If a Workshop produces an artifact (e.g. a trained classifier), it lands in `ceoArtifacts` with `trigger: 'workshop'` and passes the same `filterOutput()` as agent-produced artifacts.

## Incident Response

### If AI generates inappropriate content:
1. Log the creation ID, prompt, and output
2. Block the creation from public view immediately
3. Review and update safety filters
4. Notify affected user (if authenticated)

### If data breach suspected:
1. Revoke all Firebase tokens
2. Rotate all API keys
3. Assess scope via Firebase audit logs
4. Notify affected users within 72 hours (DPDPA requirement)
5. Report to Data Protection Board if personal data compromised

---

## Phase 4: DPDP Act 2023 Compliance

India's Digital Personal Data Protection Act 2023 + Rules 2025 classify every user under 18 as a **Child** and require verifiable parental consent for all processing of children's data. Penalties reach Rs 200 crore. Enforcement window closes Nov 2026 (18 months after Rules notification). Phase 4 (`stories/phase-4/COMPLIANCE-002-dpdp-consent-erasure.md`) implements the full compliance stack.

### Consent Scopes

Consent is captured per scope, not as a blanket opt-in:

| Scope | What it gates |
|---|---|
| `ai_generation` | Running any AI generator on the kid's data (HPC, feedback, digest, etc.) |
| `data_storage` | Persisting creations, submissions, concepts learned |
| `parent_messaging` | Sending messages to parent via Telegram/WhatsApp/SMS/email |
| `peer_sharing` | Showing kid's creations in class feed / explore / remix |
| `analytics` | Including kid in anonymized school-level analytics |

### Consent Capture Flow

1. Parent phone is verified via OTP (AUTH-001 reuse).
2. Parent sees plain-language explanation per scope (no legalese) — `components/parent/ConsentRegister.tsx`.
3. Explicit checkbox per scope + "I am the parent or legal guardian" affirmation.
4. Re-verification OTP on first grant per scope.
5. `consentLog` record written with `{ parentUid, kidId, scope, granted: true, method: 'otp_affirmation', ip, userAgent, timestamp }` — audit trail is append-only.

### Consent Enforcement

Every AI generator endpoint calls `hasConsent(parentUid, kidId, scope)` before running. Every messaging send checks `parent_messaging`. Revocation (`DELETE /api/dpdp/consent`) writes a new `consentLog` entry with `granted: false` and stops downstream activity within 1 minute (checked at start of each generator call; no long-running jobs).

### Right to Erasure

`POST /api/dpdp/erasure` queues an erasure request. `lib/dpdp/dataErasure.ts` cascades across:

- `creations`, `submissions`, `reactions`, `hpcNarratives`, `lessonPlans` (if linked), `questionPapers` (detokenize references only — papers are teacher-owned), `notifications`, `parentDigests`, `commsLog`, `teacherAiUsage` (anonymize), media files in Firebase Storage.

Must complete within 30 days. A signed tamper-evident receipt is returned to the parent via `receiptUrl`.

### Right to Data Export (Subject Access Request)

`GET /api/dpdp/export?kidId=` returns both a JSON dump and a human-readable PDF covering all collections referencing the child. Rate-limited to 1 request per 7 days per kid.

### DPDP Register

The `complianceReport.ts` v2 PDF (COMPLIANCE-001) enumerates, per school:

- What personal data is held for each kid (name, age, grade, creation content, AI prompts, submissions, parent phone)
- Purpose and legal basis per category
- Retention period (90 days for AI prompts; term-end for submissions; permanent for HPC narratives unless erased)
- Consent status snapshot
- Data-deletion request log

This PDF is both a **CBSE AI-curriculum compliance artifact** AND a **DPDP data-processing register** — one download, two purposes.

### No Behavioral Tracking of Minors

Per DPDP Rules 2025 and NEP 2020 guidance:

- No third-party analytics on kid sessions (no GA4, Mixpanel, etc. on authenticated kid routes).
- No targeted advertising, ever.
- No GPS, real names beyond first-name display, no photos of kids.
- No cross-device identity stitching for kids.

### Role Extensions for DPO View

`schoolAdmin` role doubles as the school's Data Protection Officer surface:

- Can view consent log for all kids in their school (`/api/dpdp/consent/audit?kidId=...` scoped to school)
- Can view erasure queue and mark processing
- Can generate per-student data-export on behalf of a parent (requires parent identity verification first)
- Cannot modify or delete consent records — only parent action can revoke consent

### Incident Response — DPDP Child-Data Incident

In addition to the general breach response above:

1. Notify the Data Protection Board within 72 hours (mandatory)
2. Notify each affected parent via the channel they consented to for messaging, plus email
3. Offer immediate erasure of the kid's data without the usual process
4. Log the incident in a dedicated register retained for 3 years
5. Post-incident: review AI safety filters and consent enforcement paths
