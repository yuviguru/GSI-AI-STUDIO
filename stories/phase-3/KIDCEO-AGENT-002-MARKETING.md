# KIDCEO-AGENT-002-MARKETING: Marketing Agent + Marketing tab

## Description
Second agent, first one that runs **recurring** workflows (not just a
one-shot milestone artifact). Handles:

- **FIRST_CUSTOMERS milestone** — the poster / first-campaign package
  (artifact: 3 posters + 2 social post copy variants).
- **Regular marketing events** — the Marketing Agent can be configured
  to auto-generate marketing-category regulars' candidate choices with
  an "accept / tweak / reject" UX rather than kid picking A/B/C blind.
- **Marketing tab surface** — a dashboard listing every marketing
  artifact the kid has shipped (posters, posts, campaigns), with a
  "Post this" button per item that feeds a small reputation bump +
  customer-reach event.

This story introduces the **ongoing-agent pattern** — an agent whose
value compounds across the sim, not just one-off milestone delivery.

## Open decisions captured with defaults
1. Auto-run vs kid-triggered → **kid-triggered for now**. Auto-run on
   regulars is deferred to v1.1 once we have telemetry on how often
   kids actually want delegation vs control.
2. Poster count → **3 candidates**.
3. Social post variants → **2 per run** (short + longer).
4. Marketing agent unlock → **Launch phase** (matches original design).
5. Default focus dial → "Growth" (other options: "Brand", "Community").

## Requires KB Updates
- `docs/data-model.md` — `ceoArtifacts.assets` extends with
  `{ type: 'poster' }` and `{ type: 'social_post' }` asset shapes.
- `docs/api-contracts.md` — document `workflowId` values
  `marketing.firstCampaign` and `marketing.dailyPush`.
- `docs/ux-patterns.md` — "Agent dashboard tab" pattern (Marketing
  tab is the first instance; Ops/Finance follow the same shape).

## Subtasks

### [LIB] `marketing.firstCampaign` workflow
**Target**: `lib/ceo/agents/workflows/marketingFirstCampaign.ts`
**Action**: Create
**Requirements**:
- Briefing schema: `offer` (MC: discount / freebie / premium), `vibe`
  (MC: energetic / warm / clever), `hook` (free-text ≤25 chars).
- Steps:
  1. Claude expands brief → structured campaign brief pulling in
     `business.brandAssets.voice` so the campaign stays on-brand.
  2. Flux Schnell × 3 → 3 posters.
  3. Claude × 1 → 2 social post variants (one ≤30 words, one ≤80).
- Output: `{ posters: AssetImage[], posts: AssetText[] }`.

### [LIB] `marketing.dailyPush` workflow
**Target**: `lib/ceo/agents/workflows/marketingDailyPush.ts`
**Action**: Create
**Requirements**:
- Lightweight workflow the kid runs once / day max when they want a
  quick reputation nudge. Produces one social post (text only, no
  image) targeting a single beat from the focus dial.
- Rate-limited per business: 1 run / IST day, independent of the
  regular-events cap.

### [API] Marketing-specific wiring
**Target**: `app/api/ceo/marketing/post/route.ts` (new)
**Action**: Create
**Requirements**:
- `POST /api/ceo/marketing/post` — "Post this" action on a previously-
  accepted marketing artifact. Applies a small, deterministic
  reputation/reach bump to the business (capped to +3/day across all
  posts to prevent abuse).
- The bump numbers live in `lib/ceo/constants.ts` alongside existing
  multipliers.

### [FE] Marketing tab
**Target**: `components/ceo/MarketingTab.tsx` (new),
`app/(public)/ceo/play/page.tsx`
**Action**: Create/Update
**Requirements**:
- Tab visible on play surface once `business.phase !== 'pre_launch'`.
- Shows: "Active campaigns" grid (posters + posts from accepted
  Marketing artifacts), each card has metadata and a "Post this"
  button (disabled once the daily cap is hit).
- Empty state pre-launch: "Your Marketing Agent unlocks at launch!".
- Empty state post-launch, no campaigns yet: CTA to hire the
  Marketing Agent OR run the `marketing.firstCampaign` workflow if
  already hired.

### [FE] FIRST_CUSTOMERS milestone integration
**Target**: `lib/ceo/eventEngine.ts`,
`components/ceo/agents/AgentEventCard.tsx`
**Action**: Update
**Requirements**:
- When FIRST_CUSTOMERS milestone generates, attach
  `agentWorkflowId: 'marketing.firstCampaign'`.
- Same AgentEventCard pattern from KIDCEO-AGENT-001-BRAND renders the
  briefing + candidate review.

### [BOT] Telegram mirror
**Target**: `lib/bot/modules/ceo.ts`
**Action**: Update
**Requirements**:
- Marketing Agent hire, first campaign flow, and "Post this" all
  mirrored as inline-keyboard flows (same pattern as the Brand agent
  on Telegram).

### [TEST] Coverage
**Target**: `lib/ceo/agents/workflows/marketingFirstCampaign.spec.ts`,
`app/api/ceo/marketing/post/route.spec.ts`
**Action**: Create
**Requirements**:
- Workflow: asserts `brandAssets.voice` flows into step 1's prompt.
- Post route: daily cap enforcement; unauth'd call rejected; posting
  an un-accepted candidate rejected.

## Dependencies
- **KIDCEO-AGENT-PRIMITIVE**
- **KIDCEO-AGENT-001-BRAND** (Marketing voice + logo pulls from
  `business.brandAssets`)

## Acceptance criteria
- Marketing Agent hireable at `phase === 'launch'`, ₹X/day (pin in
  constants).
- FIRST_CUSTOMERS milestone resolved via agent workflow; posters
  show in the Marketing tab.
- Kid taps "Post this" → reputation +N, toast shown, daily cap
  decrements.
