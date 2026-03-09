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
│ Netlify Function │──────────────────▶│ Firebase     │
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

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Creations: public read for published, write via server only
    match /creations/{creationId} {
      allow read: if resource.data.isPublic == true || isOwner();
      allow create: if isAuthenticated() && validCreation();
      allow update: if isOwner();
      allow delete: if false; // No client-side deletion

      function isOwner() {
        return request.auth != null && request.auth.uid == resource.data.userId;
      }

      function validCreation() {
        return request.resource.data.keys().hasAll(['type', 'title', 'content']);
      }
    }

    // Users: owner read/write only
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Kid profiles: parent access only
      match /kids/{kidId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Sessions: server-side only (no client access)
    match /sessions/{sessionId} {
      allow read, write: if false;
    }

    // Curriculum: public read
    match /curriculum/{topicId} {
      allow read: if true;
      allow write: if false;
    }

    // Beat the AI rounds: server-side only (no client access)
    match /beatTheAiRounds/{roundId} {
      allow read, write: if false;
    }

    // Challenges: public read, admin write
    match /challenges/{challengeId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Schools: scoped access
    match /schools/{schoolId} {
      allow read: if isSchoolMember(schoolId);
      allow write: if isSchoolAdmin(schoolId);

      match /{subcollection}/{docId} {
        allow read: if isSchoolMember(schoolId);
        allow write: if isSchoolTeacher(schoolId);
      }
    }

    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isSchoolMember(schoolId) {
      return request.auth != null; // Simplified — check school membership in practice
    }

    function isSchoolAdmin(schoolId) {
      return request.auth != null; // Simplified — check admin role in practice
    }

    function isSchoolTeacher(schoolId) {
      return request.auth != null; // Simplified — check teacher role in practice
    }
  }
}
```

---

## AI Content Safety

### Child Safety is the #1 Priority

All AI-generated content must be safe for children ages 8-17. This is enforced at multiple layers.

### Input Safety Pipeline

```
User Input → [1. Client-side blocklist] → [2. Server profanity filter] → [3. Claude safety prompt] → AI Generation
```

1. **Client-side blocklist**: Basic word filter to catch obvious inappropriate input before sending to server. UX-friendly: "Let's try a different idea!"
2. **Server profanity filter**: Comprehensive filter using a curated blocklist. Rejects request with `UNSAFE_CONTENT` error.
3. **Claude safety prompt**: System prompt instructs Claude to refuse inappropriate requests and generate only child-safe content.

### Output Safety Pipeline

```
AI Output → [4. Content classifier] → [5. PII detection] → [6. Image NSFW check] → User
```

4. **Content classifier**: Claude-based review of generated text for age-appropriateness
5. **PII detection**: Scan output for phone numbers, addresses, emails (should never appear)
6. **Image NSFW check**: Replicate's built-in safety filter + custom check

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

### What We Never Collect
- Real names of children (display names only, can be fictional)
- Photos of children
- Location data (GPS)
- School name (unless school account, Phase 3)
- Contact information of children
- Browsing history or cross-site tracking

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
- All AI calls proxied through Netlify Functions
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
