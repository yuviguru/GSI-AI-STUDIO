# KIDCEO-DAILY-RHYTHM: Fixed milestone cadence, pull regulars, dual pending slots

## Description
Kid CEO today fires milestone events on a pace-dependent rolling interval
(18h/34h/48h for 15/30/45-day paces), auto-chains regular events after
every regular decision, and keeps a single `pendingEvent` slot per
business. Kids experience this as "random events keep popping up" — the
opposite of the intended daily-habit loop.

This story switches to a clean daily rhythm:

- **Milestones are push**, delivered once per day at a fixed IST hour
  (proposed default **18:30 IST**, configurable via env). On business
  register, the first milestone fires synchronously (already works).
- **Regulars are pull**. Kid taps "Take a small decision" on the play
  surface when they want one; 5-per-IST-day cap stays. No auto-chain
  after a regular decision.
- **Missed milestones expire**. If yesterday's milestone is still pending
  when today's delivery tick fires, the stale one is marked
  `status: 'expired'` (0 impact on outcome) and today's new milestone is
  minted. No guilt-trip penalty.
- **Dual pending slots**: the business tracks pending milestone and
  pending regular independently so they can coexist. Pending regular no
  longer blocks the milestone cron; pending milestone no longer blocks
  the regular pull endpoint.
- **Two-zone /ceo/play UI**: milestone zone (big, prominent, or countdown
  to next tick) over small-decisions zone (counter + pull button or
  active regular). Decision history collapsed below.

The same model ships to the Telegram bot (`lib/bot/modules/ceo.ts`) in
parallel so web + bot share the same mental model.

## Locked decisions (see KIDCEO-PHASE-3-DECISIONS.md for sign-off)
1. **Milestone delivery time — 18:30 IST** (after-school). Env override
   `CEO_MILESTONE_DELIVERY_HOUR_IST` for ops tuning without a deploy.
2. **Regular cap reset — IST midnight** (00:00 Asia/Kolkata).
3. **Expired milestone penalty — scaling by `MILESTONE_STAKES_MULTIPLIER`**.
   Rep −1×M, morale −1×M, cash −₹50×M (cash only when the event
   category is cash-adjacent: pricing, funding, competition, capital,
   ops-supplier). Floors at 0. Table in the decisions doc.
4. **Telegram mirror — full parity**. `/ceo` shows a "📋 Take a small
   decision (N/5 left)" inline button when a pull is available; bot
   respects the same hybrid auto-chain rule as the web.
5. **Regular auto-chain — hybrid**:
   - After a milestone decision → **no auto-regular**. Kid chooses:
     pull a regular, or walk away until tomorrow.
   - After a regular decision → **auto-chain the next regular** until
     the 5/day cap is hit (keeps today's continuous-session feel).
   - First regular of the day (no prior regular) → **kid pulls**.

## Requires KB Updates
- `docs/data-model.md` — `ceoBusiness` gains:
  - `pendingMilestoneEventId: string | null`
  - `pendingRegularEventId: string | null`
  - `nextMilestoneScheduledAt: Timestamp | null` (for the fixed-hour
    cron gate)
  - Deprecate `nextEventAt` (legacy single-slot cursor) in favour of the
    above. Keep the field readable for backfill but stop writing it.
- `docs/api-contracts.md` — document the unchanged shape of
  `POST /api/ceo/event` (explicitly "pull regular only") plus the
  response additions from decide (`regularCapHit`, `nextEventFailed`
  already present; just formalise them).
- `docs/architecture.md` — new "Kid CEO Daily Rhythm" subsection under
  the CEO architecture block describing the cron cadence, expiry logic,
  and dual-pending-slot invariants.
- `docs/ux-patterns.md` — new "Two-zone play surface" pattern covering
  milestone-over-regulars stacked layout and the countdown empty state.

## Subtasks

### [KB] Data-model updates
**Target**: `types/ceo.types.ts`, `docs/data-model.md`, `firestore.rules`,
`firestore.indexes.json`
**Action**: Update
**Requirements**:
- Extend `CeoBusiness` with `pendingMilestoneEventId`,
  `pendingRegularEventId`, `nextMilestoneScheduledAt`.
- Add `'expired'` to `CeoEvent.status` union.
- `firestore.rules` — no ownership rule changes (still server-write
  only); just ensure the new fields pass validation.
- `firestore.indexes.json` — new composite index for
  `ceoBusiness(status ASC, nextMilestoneScheduledAt ASC)` so the daily
  cron can page through due businesses without a full scan.

### [LIB] Milestone cadence helpers
**Target**: `lib/ceo/cadence.ts` (new)
**Action**: Create
**Requirements**:
- `nextMilestoneAtIst(now: Date, hourIst: number): Date` — given the
  delivery hour (0–23) in IST, return the next Date that lands on it.
- `isSameIstDay(a: Date, b: Date): boolean` — boundary helper used by
  the expiry logic and the regular cap reset.
- Pure functions, deterministic, fully unit-tested against DST-free IST
  (IST is fixed UTC+5:30, no DST).

### [LIB] Ceo service — dual pending slots
**Target**: `lib/firebase/ceoService.ts`
**Action**: Update
**Requirements**:
- New: `getPendingMilestoneForBusiness(businessId): Promise<CeoEvent | null>`.
- New: `getPendingRegularForBusiness(businessId): Promise<CeoEvent | null>`.
- Update `saveCeoEvent` to also write the business-level pointer
  (`pendingMilestoneEventId` or `pendingRegularEventId`) in the same
  transaction as the event insert.
- Update `recordEventDecision` to clear the matching pointer atomically
  with the decision write.
- New: `expireStaleMilestone(businessId): Promise<{ event: CeoEvent,
  penalty: { rep, morale, cash } } | null>` — marks the pending
  milestone as `'expired'`, clears the pointer, applies the locked
  D3 scaling penalty (rep −1×M, morale −1×M, cash −₹50×M when the
  event category is cash-adjacent), floors each business metric at 0,
  and returns both the expired event and the applied deltas so the
  cron/logs can surface them. Uses a Firestore transaction so the
  expire + penalty lands atomically.
- Deprecated (keep, don't remove): `getPendingEventForBusiness` —
  resolves the first non-null of {milestone, regular}; tagged with a
  `@deprecated` JSDoc pointing at the two typed helpers.

### [CRON] Fixed-hour milestone delivery
**Target**: `netlify/functions/ceo-deliver-milestones.ts`
**Action**: Update
**Requirements**:
- Replace the pace-driven `minIntervalHoursFor(pace)` check with a
  fixed-hour gate: deliver a milestone only when
  `now` is within a 2h tolerance window after today's IST 18:30 tick
  AND `lastMilestoneDeliveredAt` is not on the same IST day.
- Before minting: if there's a pending milestone from a PREVIOUS IST
  day, call `expireStaleMilestone(businessId)` first, then proceed.
- Preserve the `skipped-pending` branch ONLY for pending milestones
  from the SAME IST day (shouldn't happen, but defensive).
- Drop the `minIntervalHoursFor` function outright — pace no longer
  drives cadence.

### [API] Decide route — hybrid auto-chain
**Target**: `app/api/ceo/decide/route.ts`
**Action**: Update
**Requirements**:
- Preserve the current auto-chain behaviour on **regular** decisions
  (generate next regular if under cap) — `nextEvent` stays populated.
- **Drop** the auto-chain on **milestone** decisions — after a
  milestone decide, `nextEvent` is always `null`. Kid gets the
  "take a small decision" CTA in the UI if they want a regular.
- Update the JSDoc block at top to reflect the hybrid behaviour per
  D4 in `KIDCEO-PHASE-3-DECISIONS.md`.

### [API] Pull-regular endpoint (mostly unchanged)
**Target**: `app/api/ceo/event/route.ts`
**Action**: Update
**Requirements**:
- No behaviour change — already implements the pull model — but update
  JSDoc and the "idempotency" wording now that the only way a regular
  event exists is via this endpoint.
- Use `getPendingRegularForBusiness` instead of
  `getPendingEventForBusiness` so a pending milestone doesn't cause
  the early-return idempotency branch.

### [BOT] Telegram mirror
**Target**: `lib/bot/modules/ceo.ts`
**Action**: Update
**Requirements**:
- `handleDecide` — mirror the web's hybrid auto-chain: after a
  milestone decision send the feedback + "📋 Take a small decision"
  CTA, do NOT auto-send another event. After a regular decision,
  auto-chain the next regular (if under cap) by calling `sendEvent`
  with the freshly-generated event — matches today's behaviour for
  regular→regular.
- `handleCeo` — when the kid has 1 active business, show the
  "📋 Take a small decision (N / 5 left today)" button when regular
  slots remain AND no pending regular exists. Tapping it calls the
  same logic as the web's `/api/ceo/event` (server-side slot
  reservation + mint).
- New callback prefix `ceo_pull_regular:<businessId>`.

### [FE] Two-zone play surface
**Target**: `app/(public)/ceo/play/page.tsx`,
`components/ceo/MilestoneZone.tsx` (new),
`components/ceo/SmallDecisionsZone.tsx` (new)
**Action**: Create/Update
**Requirements**:
- Rewrite the play surface to a two-zone layout (see
  `docs/ux-patterns.md#two-zone-play-surface`).
- `MilestoneZone` — shows pending milestone event OR a countdown card
  ("Your next Big Choice arrives at 6:30 PM IST" with live countdown).
- `SmallDecisionsZone` — shows pending regular OR the pull button with
  counter (`2 / 5 left today`) OR "All 5 small decisions done — resets
  at midnight IST" at cap.
- Both zones use a shared `EventCard` component (extract from current
  `EventCard` if needed).
- Decision history stays collapsed below both zones.

### [TEST] Unit + integration coverage
**Target**: `lib/ceo/cadence.spec.ts`, `lib/firebase/ceoService.spec.ts`,
`app/api/ceo/decide/route.spec.ts`,
`netlify/functions/ceo-deliver-milestones.spec.ts` (new)
**Action**: Create/Update
**Requirements**:
- 100% coverage on `lib/ceo/cadence.ts` (pure functions, cheap).
- Decide route: confirm milestone decision → `nextEvent: null`;
  regular decision → `nextEvent: null` (new behaviour); expired
  milestone → scored as 0; dual-pending coexistence test.
- Cron: test the fixed-hour gate, the expiry branch, the same-IST-day
  skip, and the "no milestones left in arc" terminal state.

## Dependencies
- None — this is the first phase-3 Kid CEO story and a prerequisite for
  all agent stories (agents attach to specific milestones/regulars, so
  the pending-slot model must be dual before agents can deliver
  milestone-time artifacts without blocking each other).

## Acceptance criteria
- Kid registers a new business → first milestone event shown
  synchronously. No other events fire until the next IST 18:30 tick.
- Kid answers the milestone → `pendingMilestoneEventId` cleared; no
  new event auto-generates; Small-decisions zone surfaces the
  "📋 Take a small decision (5 / 5 left)" CTA.
- Kid taps "Take a small decision" → `pendingRegularEventId` is set to
  the minted regular; cap counter increments.
- Kid answers the regular → `pendingRegularEventId` cleared; if cap
  not hit, next regular auto-chains (same UX as today). If cap hit,
  "All 5 done — resets at midnight IST" state.
- Kid doesn't answer today's milestone → next 18:30 IST tick marks
  the stale one `expired`, applies the D3 scaling penalty, and mints
  today's new milestone. Expired event visible in history with
  "Missed — X reputation / Y morale / ₹Z cash" badge.
- `/ceo/play` never shows a milestone event AND a regular event in the
  same zone — always one in each zone, independently.
- Telegram parity: same flows on `@GSIKidCeoAssistantBot` including
  the pull button, hybrid auto-chain, and expired-milestone penalty
  ping ("yesterday's Big Choice expired — −3 rep, −3 morale").
