# FoundersDNA → GSI-AI-STUDIO Integration Plan
## Feature Name: **Kid CEO**
> "Run your first business before you spend a rupee."
> Target age **10+** · Delivered via web app + `@GSIKidCeoBot` on Telegram · Source port: `C:\Yuvi\Development\SimPrenuer`

---

## 1. WHY THIS FIT WORKS

| GSI-AI-STUDIO already has | FoundersDNA brings |
|---|---|
| Kid-focused AI platform (ages 8-17) | Business simulation engine |
| Groq + Claude LLM pipeline (server-side) | Event generation + scoring prompts |
| Beat the AI (challenge game with scoring) | Phase-based decision simulation |
| Skill Arena (assessment with dimensions) | 6-dimension founder profiling |
| AI Points + 12-badge progression | Milestone DAG + phase advancement |
| Anonymous sessions + planned auth | Per-business simulation state |
| Firestore (NoSQL, real-time) | Business state + event history |
| Content safety pipeline | Already kid-safe by design |
| Next.js App Router (modular routes) | New route group: `/ceo/` |
| Koko mascot (7 expressions) | Can be the "business advisor" |
| PWA + mobile-first | In-app event feed (dual delivery) |

**What changes:**
- Delivery: **Dual mode** — in-app event feed AND a dedicated Telegram bot (`@GSIKidCeoBot`). Same Firestore, same events, kid picks their preferred channel. WhatsApp is not in v1 — the adapter interface is ready to plug in after Meta Business approval.
- Supabase → Firestore (same data, different store)
- 6 adult dimensions → Kid-friendly rebranding
- Adult business types → Age-appropriate businesses
- Real-world current affairs → Kid-relevant scenarios (school events, local trends, seasonal)
- Bot code: Not dropped — **adapted** into the shared bot infrastructure in `lib/bot/` (see `docs/MESSENGER_BOT_ARCHITECTURE.md`)
- Age: target **10+** only in v1. No separate 8-10 variant — pace settings (30/60/90 day) let kids self-adjust cadence.

---

## 2. FEATURE ARCHITECTURE

### Route Structure (fits existing Next.js App Router pattern)

```
app/(public)/ceo/
├── page.tsx                    # CEO Studio landing — "Start Your Business"
├── register/
│   └── page.tsx                # Business registration wizard
├── play/
│   └── page.tsx                # Main simulation — event feed + decisions
├── profile/
│   └── page.tsx                # CEO Profile Card (DNA Card equivalent)
├── leaderboard/
│   └── page.tsx                # Phase 2 — compare with friends
└── layout.tsx                  # CEO-specific layout with business dashboard bar

app/api/ceo/
├── register/route.ts           # Create business + seed Phase 1 events
├── event/route.ts              # Generate next event (LLM)
├── decide/route.ts             # Submit decision + score + advance
├── profile/route.ts            # Get CEO profile (6 dimensions)
├── business/route.ts           # Get current business state
└── leaderboard/route.ts        # Phase 2
```

### Component Structure (follows existing pattern)

```
components/ceo/
├── BusinessRegistration.tsx     # Step-by-step business picker
├── EventCard.tsx                # Single event with 3 choices
├── EventFeed.tsx                # Timeline of events
├── DecisionFeedback.tsx         # Post-decision scoring feedback
├── PhaseProgress.tsx            # Visual phase bar (Pre-Launch → Mature)
├── MilestoneTracker.tsx         # Current phase milestones
├── CeoProfileCard.tsx           # The "DNA Card" — shareable
├── DimensionRadar.tsx           # 6-axis radar chart
├── BusinessDashboard.tsx        # Cash, reputation, morale, employees
├── CeoOnboarding.tsx            # First-time explainer
└── KokoAdvisor.tsx              # Koko mascot as business advisor
```

### Library / Engine (core logic)

```
lib/ceo/
├── phases.ts                    # Phase config + milestone DAG (from phases.js)
├── eventEngine.ts               # Event generation (adapted from eventEngine.js)
├── scoringEngine.ts             # Decision scoring + 3 enrichment layers
├── profileEngine.ts             # Build 6-dimension profile
├── businessState.ts             # Cash/reputation/morale calculations
├── templates/
│   ├── events.json              # Fallback event templates (kid-appropriate)
│   └── businesses.json          # Pre-built business types for kids
├── prompts/
│   ├── eventPrompt.ts           # Event generation system prompt
│   └── scoringPrompt.ts         # Decision scoring system prompt
└── constants.ts                 # Dimension names, phase names, multipliers
```

### Types

```
types/ceo.types.ts
├── CeoBusiness                  # Business registration + state
├── CeoEvent                     # Event with 3 choices
├── CeoDecision                  # User's choice + timing + scores
├── CeoProfile                   # 6 dimensions + metadata
├── CeoPhase                     # Phase definition + milestones
├── CeoMilestone                 # Individual milestone state
└── CeoDimension                 # Single dimension score + history
```

---

## 3. KID-APPROPRIATE ADAPTATIONS

### Business Types (replace adult verticals)

| Adult (FoundersDNA) | Kid Version (doop CEO) |
|---|---|
| Cloud Kitchen | Lemonade Stand / Snack Cart |
| AI Agency | App / Game Studio |
| D2C Brand | Handmade Crafts Shop |
| SaaS Startup | School Newsletter / Blog |
| Cafe | Ice Cream Parlour |
| Print on Demand | T-Shirt / Sticker Shop |
| Freeform | "Invent Your Own Business" |

### 6 Dimensions (kid-friendly rebrand)

| Adult Dimension | Kid Version | Kid-Friendly Description |
|---|---|---|
| Risk Calibration | **Bold Moves** | "Do you take smart chances or play it safe?" |
| Capital Discipline | **Money Smarts** | "Do you spend wisely or blow your budget?" |
| Growth Instinct | **Big Dreams** | "Do you think big or stay small?" |
| Operational Rigor | **Getting It Done** | "Are you organised or all over the place?" |
| People & Leadership | **Team Captain** | "Do you inspire people or go solo?" |
| Crisis Response | **Cool Under Pressure** | "Do you stay calm or freak out when things go wrong?" |

### 4 Pillars (kid version)

| Adult Pillar | Kid Version |
|---|---|
| Vision | **Dreamer** — "Can you imagine what's possible?" |
| Discipline | **Builder** — "Can you manage your money and your time?" |
| Continuous Commitment | **Leader** — "Can you keep going when it gets tough?" |
| Learning | **Grower** — "Do you get better each time?" |

### Phase Names (keep same structure, soften language)

```
Pre-Launch  → "Getting Ready"     (5 milestones)
Launch      → "Opening Day"       (4 milestones)
Early Growth → "Growing Up"       (4 milestones)
Scale       → "Going Big"         (4 milestones)
Mature      → "Running the Show"  (3 milestones)
```

### Scenario Adaptation

**Adult event:**
> "Your primary ingredient supplier calls — 25% price hike starting next week. Rent due in 5 days."

**Kid event:**
> "Your lemon supplier says prices went up! You need lemons by Saturday for the school fair. Your piggy bank has ₹500 left."

**Rules that stay the same:**
- Anti-gaming: no virtue-signaling, projective framing, hidden scoring
- 3 defensible choices per event
- Response time tracked
- Multi-pillar impact in opposite directions
- Internal scoring only

**Rules that adapt:**
- Language: simpler, Flesch-Kincaid grade 5-6
- Stakes: pocket money, not lakhs
- Characters: friends, family, teachers — not investors, VCs, employees
- Scenarios: school fairs, neighbourhood, local events — not supply chains, PR crises

---

## 4. DATABASE MIGRATION (Supabase → Firestore)

### New Firestore Collections

```
ceoBusiness (top-level collection)
├── id: string (auto)
├── sessionId: string (links to existing sessions collection)
├── userId: string (Phase 2 — links to users collection)
├── kidId: string (Phase 2 — links to kids sub-collection)
├── businessName: string
├── businessType: string (from predefined list)
├── location: string
├── startingCapital: number
├── currentCash: number
├── reputation: number (0-100)
├── morale: number (0-100)
├── employees: number
├── phase: string ('pre_launch' | 'launch' | 'early_growth' | 'scale' | 'mature')
├── phaseMilestones: map {
│     BRAND: 'pending' | 'resolved',
│     LOCATION: 'pending' | 'resolved',
│     ...
│   }
├── totalDecisions: number
├── status: 'active' | 'completed' | 'paused'
├── pace: '30' | '60' | '90' (days)
├── createdAt: timestamp
├── updatedAt: timestamp
└── completedAt: timestamp | null

ceoEvents (top-level, indexed by businessId)
├── id: string (auto)
├── businessId: string (→ ceoBusiness)
├── sessionId: string
├── title: string
├── description: string
├── category: string
├── phase: string
├── milestone: string | null
├── choices: array [
│     { id: 'A', text: string, scoring_hint: string, weights: map }
│   ]
├── status: 'pending' | 'decided' | 'expired'
├── decidedChoice: string | null
├── decisionTimestamp: timestamp | null
├── responseTimeSeconds: number | null
├── scores: map { risk_calibration, capital_discipline, ... } | null
├── feedback: string | null
├── createdAt: timestamp
└── expiresAt: timestamp

ceoProfiles (top-level, indexed by sessionId/userId)
├── id: string (auto)
├── sessionId: string
├── userId: string (Phase 2)
├── businessId: string
├── dimensions: map {
│     risk_calibration: { score: number, decisions: number, trend: 'up'|'down'|'stable' },
│     capital_discipline: { ... },
│     growth_instinct: { ... },
│     operational_rigor: { ... },
│     people_leadership: { ... },
│     crisis_response: { ... }
│   }
├── totalDecisions: number
├── avgResponseTime: number
├── currentPhase: string
├── shareUrl: string (unique slug)
├── isPublic: boolean
├── createdAt: timestamp
└── updatedAt: timestamp
```

### Firestore Indexes Needed

```json
{
  "indexes": [
    { "collectionGroup": "ceoEvents", "fields": [
      { "fieldPath": "businessId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "ceoEvents", "fields": [
      { "fieldPath": "businessId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" }
    ]},
    { "collectionGroup": "ceoBusiness", "fields": [
      { "fieldPath": "sessionId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]},
    { "collectionGroup": "ceoProfiles", "fields": [
      { "fieldPath": "sessionId", "order": "ASCENDING" },
      { "fieldPath": "updatedAt", "order": "DESCENDING" }
    ]}
  ]
}
```

---

## 5. LLM INTEGRATION (reuse existing GSI pipeline)

### What already exists in GSI-AI-STUDIO:
- `lib/ai/groqClient.ts` — Groq API wrapper (llama-3.3-70b)
- `lib/ai/claudeClient.ts` — Claude Sonnet wrapper
- JSON extraction, error handling, fallback chain

### What FoundersDNA needs:
- Event generation prompt → `lib/ceo/prompts/eventPrompt.ts`
- Decision scoring prompt → `lib/ceo/prompts/scoringPrompt.ts`

### Adapter Pattern (no new LLM clients needed)

```typescript
// lib/ceo/eventEngine.ts
import { generateWithGroq } from '@/lib/ai/groqClient';
import { generateWithClaude } from '@/lib/ai/claudeClient';
import { EVENT_GENERATION_PROMPT } from './prompts/eventPrompt';

export async function generateEvent(business: CeoBusiness, milestone?: string) {
  const userPrompt = buildEventUserPrompt(business, milestone);
  
  // Reuse existing GSI LLM pipeline — Groq primary, Claude fallback
  try {
    const result = await generateWithGroq(EVENT_GENERATION_PROMPT, userPrompt, {
      temperature: 0.9,
      max_tokens: 1200,
    });
    return parseEventResponse(result);
  } catch {
    const result = await generateWithClaude(EVENT_GENERATION_PROMPT, userPrompt, {
      temperature: 0.9,
      max_tokens: 1200,
    });
    return parseEventResponse(result);
  }
}
```

---

## 6. INTEGRATION WITH EXISTING GAMIFICATION

### AI Points Integration
| CEO Action | AI Points | Reason |
|---|---|---|
| Register a business | 15 | "First creation" equivalent |
| Make a decision | 5 | Per-event engagement |
| Complete a milestone | 10 | Progress reward |
| Complete a phase | 25 | Major achievement |
| Complete full simulation | 50 | Master achievement |
| Share CEO Profile Card | 10 | Same as existing share reward |

### New Badges (add to existing 12-badge system)
| Badge | Unlock Condition | Icon Idea |
|---|---|---|
| `first_business` | Register first business | 🏪 |
| `quick_thinker` | 3 decisions under 15 seconds | ⚡ |
| `money_smart` | Complete sim with >50% cash remaining | 💰 |
| `phase_master` | Complete all 5 phases | 🏆 |
| `serial_ceo` | Complete 3 different business types | 🔄 |
| `cool_head` | Score 70+ on Crisis Response | 🧊 |

### Koko Mascot as Business Advisor
- Koko appears at key moments with contextual advice
- Phase transitions: "Congrats! Your lemonade stand is officially open! 🎉"
- Low cash warning: "Careful! You're running low on money. Think before you spend!"
- Milestone complete: "Nice! You figured out your brand. That's how real CEOs start."
- Uses existing `components/mascot/` with new expression: `thinking` or `business`

---

## 7. DUAL DELIVERY: IN-APP + MESSENGER BOT

> Full messenger architecture: see `docs/MESSENGER_BOT_ARCHITECTURE.md`

### Two Bots, Shared Infrastructure

GSI-AI-STUDIO runs **two separate Telegram bots** that share the same `lib/bot/` codebase (adapter, router, context, session store, services):

| Bot Handle | Purpose | Modules Registered |
|---|---|---|
| `@GSIStudioBot` | General studio features — homework, challenges, skill assessments, creation alerts, parent summaries | `homework`, `challenge`, `skills`, `notifications` |
| `@GSIKidCeoBot` | Kid CEO business simulation (this feature) — long-running 30/60/90-day sims | `ceo` only |

**Why two bots, not one:**
- **Long-running nature** — Kid CEO runs for weeks. A dedicated chat keeps CEO context mentally separate from day-to-day homework/challenges.
- **Clean command namespace** — no `/ceo` clashing with `/homework` in the same chat; each bot's command menu stays short.
- **Positioning flexibility** — Kid CEO can be marketed/onboarded standalone to parents and (eventually) schools.
- **Independent deploy cadence** — the CEO webhook handler can be updated without touching homework flow.

**Shared infrastructure — zero duplication:**

```
netlify/functions/
├── telegram-webhook-studio.ts    # @GSIStudioBot  → router registers: homework, challenge, skills
└── telegram-webhook-ceo.ts       # @GSIKidCeoBot  → router registers: ceo

lib/bot/                          # Shared across both bots
├── adapters/telegram.ts          # One adapter, reused
├── router.ts                     # Same router class; each webhook instance picks its module set
├── context.ts                    # Same context builder
├── modules/                      # Feature modules — any bot can register any subset
│   ├── ceo.ts
│   ├── homework.ts
│   ├── challenge.ts
│   ├── skills.ts
│   └── notifications.ts
└── services/                     # Shared STT (Groq Whisper) / TTS (Google) / OCR / sessionStore
```

Session linking works identically across both bots — a kid's XP, badges, and AI Points sync to their single web app profile via `gsiSessionId`. A kid can play Kid CEO on `@GSIKidCeoBot` and do homework on `@GSIStudioBot` and both roll up to the same web dashboard.

The school channel is **completely separate** from both bots. Teachers post homework in the school channel. Kids forward messages from that channel to `@GSIStudioBot`'s DM (NOT `@GSIKidCeoBot`). Neither bot posts in the school channel.

### Linking a Bot Chat to a Web App Account

The kid's Telegram `chatId` is bound to their web session (and eventually Firebase Phone Auth user + kid profile) via a short-lived link token:

**Primary — Telegram deep link:**
1. Signed-in user in the web app taps "Connect Telegram" → server creates `botLinkCodes/{token}` in Firestore with `{gsiSessionId, userId, kidId, botHandle, expiresAt: now+10min, used: false}`
2. Button opens `https://t.me/GSIKidCeoBot?start=link_<token>` (or `...t.me/GSIStudioBot?...` for the studio bot)
3. Bot receives `/start` with the token param → validates → writes `botSessions/{chatId}` with the `gsiSessionId`, `userId`, `kidId` → marks the token `used: true`

**Fallback — 6-digit code:** if deep link fails (kid opens bot manually), web shows a 6-digit code and kid types `/link 123456` in the bot. Same `botLinkCodes` collection, same flow.

**Anonymous fallback:** if the kid hasn't completed Firebase Phone Auth yet, the bot still works on the anonymous `gsi-session-id` (existing pattern). Linking to an authenticated user is an upgrade step, not a blocker for first-time play.

Full spec: `docs/MESSENGER_BOT_ARCHITECTURE.md` §Auth Binding.

### Two Delivery Channels (kid chooses)

**Channel A — In-app (web/PWA)**
```
Event generated → Stored in Firestore → In-app event feed →
  Kid opens app, sees pending event, taps choice
```

**Channel B — Telegram bot (`@GSIKidCeoBot`)**
```
Event generated → Stored in Firestore → Bot pushes to private chat →
  Kid taps inline button in @GSIKidCeoBot
```

> WhatsApp is not wired in v1. The adapter interface (`MessengerAdapter`) is built so a WhatsApp adapter can be added without touching the `ceo` module — see `docs/MESSENGER_BOT_ARCHITECTURE.md`.

**Both channels read/write the same Firestore documents.** A kid can start a business on the web app and get events on Telegram, or start via `/ceo` in `@GSIKidCeoBot` and view their profile on the web app. The session is linked by `gsiSessionId`.

### Event Feed UI (in-app channel)
The `/ceo/play/` page shows:
1. **Business dashboard bar** — cash, reputation, morale, phase, milestone progress
2. **Event feed** — chronological timeline of events, latest at top
3. **Active event** — expanded with 3 choice buttons
4. **Decision history** — collapsed past events with feedback shown

### Notification System
- **In-app**: Toast notification when new event is ready
- **Telegram**: `@GSIKidCeoBot` sends event as interactive message with inline buttons
- **PWA push** (Phase 2): Web Push API via Firebase Cloud Messaging
- **WhatsApp** (Phase 2 — after Meta Business approval): adapter already wired, activate by registering the WhatsApp adapter in `telegram-webhook-ceo.ts`
- **Pace-based timing**: Events arrive based on chosen pace (30/60/90 day)
  - 30-day: ~1 event per day
  - 60-day: 1 event every 2 days
  - 90-day: 1 event every 3 days

---

## 8. CEO PROFILE CARD (DNA Card for Kids)

### Visual Design
- Follows existing GSI-AI-STUDIO design system (kid-friendly, colorful)
- 6-axis radar chart using same library as Skill Arena assessments
- Business name + type + kid's name
- Phase completed badge
- Shareable via existing share infrastructure (`/view/[id]`)
- Downloadable as PNG (existing download pattern)

### Share Integration
- Reuses existing `components/shared/ShareButton.tsx`
- WhatsApp-optimized OG tags (existing SSR pattern in `/view/[id]`)
- "I'm a Kid CEO! Check out my business profile 🚀" share text
- Links to public viewer page

---

## 9. IMPLEMENTATION PHASES

### Phase A — Core Engine (Week 1-2)
**Goal:** Working simulation in-app with fallback templates

| Task | Files | Effort |
|---|---|---|
| Port phases.js → phases.ts (TypeScript) | `lib/ceo/phases.ts` | 2h |
| Port event templates → kid-appropriate | `lib/ceo/templates/events.json` | 4h |
| Create kid business types | `lib/ceo/templates/businesses.json` | 2h |
| Port eventEngine → use GSI LLM pipeline | `lib/ceo/eventEngine.ts` | 4h |
| Port scoringEngine → TypeScript | `lib/ceo/scoringEngine.ts` | 4h |
| Port profileEngine → TypeScript | `lib/ceo/profileEngine.ts` | 3h |
| Port business state logic | `lib/ceo/businessState.ts` | 2h |
| Create CEO types | `types/ceo.types.ts` | 2h |
| Create prompts (kid-adapted) | `lib/ceo/prompts/*.ts` | 4h |
| Firestore service for CEO data | `lib/firebase/ceoService.ts` | 4h |
| **Subtotal** | | **~31h** |

### Phase B — API Routes (Week 2)
**Goal:** All endpoints working

| Task | Files | Effort |
|---|---|---|
| POST /api/ceo/register | `app/api/ceo/register/route.ts` | 3h |
| POST /api/ceo/event | `app/api/ceo/event/route.ts` | 3h |
| POST /api/ceo/decide | `app/api/ceo/decide/route.ts` | 4h |
| GET /api/ceo/profile | `app/api/ceo/profile/route.ts` | 2h |
| GET /api/ceo/business | `app/api/ceo/business/route.ts` | 2h |
| Firestore indexes + rules | `firestore.indexes.json`, `firestore.rules` | 1h |
| **Subtotal** | | **~15h** |

### Phase C — UI (Week 3)
**Goal:** Full playable experience

| Task | Files | Effort |
|---|---|---|
| CEO landing page | `app/(public)/ceo/page.tsx` | 3h |
| Business registration wizard | `components/ceo/BusinessRegistration.tsx` | 4h |
| Event feed + active event | `components/ceo/EventFeed.tsx`, `EventCard.tsx` | 5h |
| Decision feedback modal | `components/ceo/DecisionFeedback.tsx` | 3h |
| Phase progress bar | `components/ceo/PhaseProgress.tsx` | 2h |
| Business dashboard bar | `components/ceo/BusinessDashboard.tsx` | 3h |
| CEO Profile Card | `components/ceo/CeoProfileCard.tsx` | 4h |
| Radar chart (6 dimensions) | `components/ceo/DimensionRadar.tsx` | 3h |
| Koko advisor integration | `components/ceo/KokoAdvisor.tsx` | 2h |
| Onboarding flow | `components/ceo/CeoOnboarding.tsx` | 3h |
| Navigation update (add CEO to nav) | `components/layout/Navigation.tsx` | 1h |
| **Subtotal** | | **~33h** |

### Phase D — Telegram Bot Layer (Week 4)
**Goal:** Shared bot infra + `@GSIKidCeoBot` live on Telegram. `@GSIStudioBot` webhook handler stubbed (homework module ships separately).

| Task | Files | Effort |
|---|---|---|
| Bot types + interfaces | `lib/bot/types.ts` | 3h |
| Bot router (command + callback + forward routing) | `lib/bot/router.ts` | 4h |
| Telegram adapter (Grammy, webhook mode) | `lib/bot/adapters/telegram.ts` | 4h |
| Bot context + session store | `lib/bot/context.ts`, `lib/bot/services/sessionStore.ts` | 3h |
| `@GSIKidCeoBot` webhook handler | `netlify/functions/telegram-webhook-ceo.ts` | 2h |
| `@GSIStudioBot` webhook handler (stub — CEO module NOT registered here) | `netlify/functions/telegram-webhook-studio.ts` | 1h |
| Webhook registration script (registers both bot URLs) | `netlify/functions/bot-setup.ts` | 1h |
| CEO bot module (port `SimPrenuer/bot.js` → module) | `lib/bot/modules/ceo.ts` | 5h |
| Deep-link auth binding (`/start link_<token>` + `/link <code>`) | `lib/bot/services/linkService.ts`, `app/api/bot/link/route.ts` | 4h |
| Session linking (bot ↔ web app) | `lib/firebase/botSessionService.ts` | 3h |
| **Subtotal** | | **~30h** |

### Phase E — Polish + Integration (Week 5)
**Goal:** Feels native to GSI-AI-STUDIO, both channels working

| Task | Files | Effort |
|---|---|---|
| AI Points integration | `hooks/useAiPoints.ts` + context | 2h |
| New badges (6 CEO badges) | Badge config + celebration modals | 3h |
| Share card + OG tags | `app/(viewer)/view/[id]` update | 2h |
| PWA notification for new events | Service worker update | 3h |
| Content safety for CEO events | `lib/safety/inputFilter.ts` update | 2h |
| Mobile responsive polish | All CEO components | 3h |
| Cross-channel sync (start on web, continue on bot) | Firestore listeners | 3h |
| E2E tests (web + bot) | `e2e/ceo.spec.ts` | 5h |
| **Subtotal** | | **~23h** |

### **Total: ~132 hours (~3.5 weeks full-time, ~5 weeks part-time)**

> **Note:** The `lib/bot/` infrastructure built in Phase D is shared between `@GSIKidCeoBot` and `@GSIStudioBot`. Adding homework/challenges/skills later is just a new `lib/bot/modules/*.ts` file registered in `telegram-webhook-studio.ts` — no new infrastructure.

---

## 10. WHAT PORTS DIRECTLY vs. WHAT REWRITES

### Direct Port (logic unchanged, just TypeScript + Firestore)
- `phases.js` → `phases.ts` (milestone DAG, phase config, helper functions)
- Scoring enrichment (phase multipliers, response-time signal, state-context amplifiers)
- Anti-gaming rules (all 6 rules stay identical)
- Choice format (`text`, `scoring_hint`, `weights`) — same internal structure
- Profile calculation (aggregation, dimension spectrums)

### Adapt (same logic, different context)
- Event generation prompt → kid-appropriate language
- Decision scoring prompt → simpler dimension descriptions
- Templates → kid business scenarios
- Dimension names → kid-friendly names
- Phase names → kid-friendly names
- Business types → age-appropriate

### Replace (different implementation)
- Supabase queries → Firestore queries
- Express API routes → Next.js API routes
- `llm.js` unified client → GSI's existing Groq/Claude pipeline
- Registration flow → In-app wizard + bot `/ceo` command (dual entry)

### Adapt into Shared Bot Layer
- `SimPrenuer/bot.js` (Grammy, long-polling) → `lib/bot/modules/ceo.ts` (webhook mode, module pattern) — registered only in `telegram-webhook-ceo.ts` for `@GSIKidCeoBot`
- `SimPrenuer/server.js` (Express, `bot.start()`) → Netlify Functions webhook handler
- Bot logic is **not dropped** — it's refactored into the shared `lib/bot/` codebase
- See `docs/MESSENGER_BOT_ARCHITECTURE.md` for full bot layer design

### Drop (truly not needed)
- Supabase client (`SimPrenuer/db.js`) — replaced by Firestore service
- Express server (`SimPrenuer/server.js`) — replaced by Next.js API routes + Netlify Functions
- `.env` Supabase tokens — replaced by Firebase config
- React/Vite frontend (`SimPrenuer/frontend/`) — replaced by Next.js pages under `app/(public)/ceo/`

---

## 11. NAVIGATION INTEGRATION

### Current GSI-AI-STUDIO Navigation
```
Home | Create ▼ | Beat the AI | Skill Arena | Explore | My Creations
          |
          ├── Story
          ├── Music
          ├── Quiz
          ├── Game
          └── Comic
```

### Updated Navigation
```
Home | Create ▼ | Kid CEO | Beat the AI | Skill Arena | Explore | My Creations
          |
          ├── Story
          ├── Music
          ├── Quiz
          ├── Game
          └── Comic
```

Kid CEO gets top-level nav placement (not nested under Create) because it's a different interaction model — ongoing 30/60/90-day simulation vs. one-shot creation.

---

## 12. DATA FLOW DIAGRAM (DUAL DELIVERY)

### Entry Point A — Web App
```
Kid opens /ceo/ in browser
        ↓
[Register Business] via web form
  → POST /api/ceo/register
  → Creates ceoBusiness doc in Firestore
  → Seeds 3 Phase 1 events
  → Returns businessId
  → Shows "Connect on Telegram too?" link (optional)
        ↓
[Event Feed loads in-app]
  → GET /api/ceo/business (state)
  → GET /api/ceo/event (pending events)
  → Shows active event with 3 choice buttons
```

### Entry Point B — Bot
```
Kid types /ceo in @GSIKidCeoBot   (or opens via deep link from web)
        ↓
[Register Business] via bot button picker
  → Bot module calls same ceoService.createBusiness()
  → Creates ceoBusiness doc in Firestore (same collection)
  → Seeds 3 Phase 1 events
  → Sends first event as inline keyboard message
```

### Shared Decision Flow (both channels)
```
[Kid taps a choice] (web button OR bot inline button)
        ↓
  → POST /api/ceo/decide { eventId, choiceId }
    (web calls API directly; bot module calls same service function)
  → Timer stops (responseTimeSeconds calculated)
  → LLM scores decision (Groq primary, Claude fallback)
  → 3 enrichment layers applied (phase × response-time × state-context)
  → Business state updated (cash, reputation, morale)
  → Milestone resolved if applicable
  → Check: isPhaseComplete? → advancePhase()
  → Next event generated (milestone-steered)
  → Saved to Firestore
        ↓
[Decision Feedback]
  → Web: animated feedback card + Koko advisor
  → Bot: markdown message with pattern description + state changes
  → Both: AI Points awarded, badge check
        ↓
[Next Event Delivery]
  → Web: event feed auto-refreshes (Firestore onSnapshot)
  → Bot: sends next event after delay (5-15s demo / pace-based prod)
        ↓
[Loop continues until all 5 phases complete]
        ↓
[Simulation Complete]
  → CEO Profile Card generated
  → Web: share button + download as PNG
  → Bot: sends profile link → /ceo/profile?s={sessionId}
  → Both: "Run another business?" prompt
  → Badge: phase_master unlocked
```

### Cross-Channel Sync
```
Kid starts on web → taps "Connect Telegram" → deep link opens @GSIKidCeoBot with link_<token>
  → Bot validates token → writes botSessions/{chatId} with gsiSessionId + userId + kidId
  → Both channels now read/write same ceoBusiness document
  → Event decided on web = bot shows "Already decided ✅" on next poll/open
  → Event decided on bot = web feed auto-updates via Firestore onSnapshot listener
```

---

## 13. RISK & MITIGATION

| Risk | Impact | Mitigation |
|---|---|---|
| LLM generates adult-inappropriate content | High | Existing safety pipeline + kid-specific system prompt rules + fallback templates |
| Kids find anti-gaming frustrating ("no right answer") | Medium | Koko explains "there's no wrong answer — we're learning how you think" during onboarding |
| Simulation too complex for younger kids | Low | v1 targets **10+** only. Pace settings (30/60/90 day) let kids self-adjust cadence. Revisit 8-10 simplified variant in Phase 2 if demand warrants. |
| Event pacing feels slow on 90-day mode | Low | Allow manual "next event" button with cooldown, not strict time-gating |
| Firestore costs at scale | Low | Same cost profile as existing creations — reads are cached, writes are sparse |

---

## 14. SUCCESS METRICS

| Metric | Target | Measurement |
|---|---|---|
| Businesses registered (first month) | 500+ | Firestore count |
| Simulation completion rate | 30%+ | completedAt not null / total |
| Avg decisions per session | 8+ | events with status=decided per business |
| CEO Profile Card shares | 20% of completed sims | shareCount > 0 |
| Return to play again | 15%+ | users with 2+ businesses |
| Avg session time in CEO Studio | 8+ minutes | Analytics |

---

## 15. DECISIONS (locked in)

1. **Feature name** — **Kid CEO**.
2. **Age target** — **10+** only in v1. No separate 8-10 variant.
3. **Bot handles** — `@GSIStudioBot` (homework, challenges, skills, notifications) + `@GSIKidCeoBot` (Kid CEO only). Shared `lib/bot/` infra.
4. **Platforms in v1** — **Telegram only**. `MessengerAdapter` interface built so WhatsApp plugs in after Meta Business approval.
5. **Auth binding** — Deep link (`https://t.me/GSIKidCeoBot?start=link_<token>`) primary; 6-digit `/link <code>` fallback. See `docs/MESSENGER_BOT_ARCHITECTURE.md` §Auth Binding.
6. **Firestore security** — All new collections (`ceoBusiness`, `ceoEvents`, `ceoProfiles`, `botSessions`, `botLinkCodes`, `homeworkSessions`) are **server-write-only via Admin SDK** (matches existing `creations` pattern).
7. **Content safety** — All bot inputs (forwarded homework, voice transcripts, free-form text) flow through the existing `lib/safety/inputFilter.ts`. Kid CEO LLM prompts include standard kid-safety rules.
8. **TTS for dictation / read-aloud** — Google Cloud TTS (already in stack, Hindi + English).
9. **LLM cost ceiling** — deferred, to be agreed before Phase A starts.

## 16. OPEN QUESTIONS (still to resolve)

1. **Multiplayer** — Phase 2 feature: friends compete running the same business type?
2. **Parent reports** — Should Kid CEO profile feed into GrowthMap dashboard (Phase 2+)?
3. **Curriculum mapping** — Can this map to CBSE financial literacy / entrepreneurship standards?
4. **Monetisation** — Free tier (1 business) + premium (unlimited businesses, advanced analytics)?
5. **Default channel on cross-channel play** — If a kid is active on both web and `@GSIKidCeoBot`, which channel pushes new events? (Current suggestion: last-active channel wins; otherwise web toast + optional Telegram push.)
6. **LLM cost ceiling** — per-kid-per-day token budget? (Decision #9 above defers this.)
