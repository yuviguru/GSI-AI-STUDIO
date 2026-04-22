# KIDCEO-AGENT-001-BRAND: Design Agent for the BRAND milestone (POC)

## Description
First kid-facing agent. Proves the agent primitive end-to-end on a
single, bounded, high-value milestone: **BRAND** in the pre_launch
phase. Replaces the current "pick A/B/C for your brand vibe" abstract
decision with a real workflow that generates logos, a motto, and a
brand voice the kid keeps.

Flow:
1. Kid hits the BRAND milestone. Event card switches to "Let your
   Design Agent handle this" mode.
2. Kid fills a 3-field briefing (mood MC, audience MC, one-word
   free-text).
3. Workflow runs (tool trace visible):
   - Step 1: Claude expands the brief into a structured design brief.
   - Step 2: Flux Schnell generates 3 logo candidates (parallel).
   - Step 3: Claude generates 3 motto candidates + 1 brand-voice card.
4. Kid sees 3 logos + 3 mottos side-by-side. Picks one of each (or
   rejects all and re-rolls; first re-roll free, subsequent cost ₹50
   in-sim).
5. Accepted assets land on `ceoBusiness.brandAssets` so every future
   event prompt gets "your brand is {motto}, visually {mood}, voice
   {voice}" as context. Makes the sim cohere around the kid's choice.

## Open decisions captured with defaults
1. Logo count → **3 candidates per run**. Enough variety, bounded
   cost (~₹3/run on Flux Schnell).
2. Motto count → **3 candidates per run**, same brief expansion.
3. Default mood options → playful / serious / bold / dreamy. Kid-
   resonant, Indian-context safe.
4. Free-text field limit → **20 chars**. Enough for "tropical" or
   "school canteen" without opening a vector for PII leaks.
5. Acceptance attachment → writes to
   `business.brandAssets = { logoUrl, motto, voice }` AND marks the
   parent BRAND milestone event `decidedChoice` with the artifact ID.
   Scoring still runs on the artifact's implied "choice weights" so
   CEO DNA updates remain consistent with other milestone answers.

## Requires KB Updates
- `docs/data-model.md` — formalise `ceoBusiness.brandAssets` shape.
- `docs/api-contracts.md` — example request/response for
  `/api/ceo/agents/run` with `workflowId: 'brand.package'`.
- `docs/ux-patterns.md` — "Agent-driven milestone" pattern (event
  card replaces A/B/C with a briefing form + candidate review).
- `docs/prd.md` — add the Design Agent to the feature list under
  Kid CEO, with the educational angle (kids learn: prompt → image
  model → selection; multimodal AI; iteration).

## Subtasks

### [LIB] `brand.package` workflow
**Target**: `lib/ceo/agents/workflows/brandPackage.ts`
**Action**: Create
**Requirements**:
- Export `BRAND_PACKAGE_WORKFLOW: WorkflowSpec`.
- Briefing schema:
  - `mood: 'playful' | 'serious' | 'bold' | 'dreamy'` (MC)
  - `audience: 'kids_my_age' | 'family' | 'neighbours' | 'school'` (MC)
  - `oneWord: string` (max 20 chars, `filterInput` applied)
- Steps:
  1. `brief_expansion` — Claude (Haiku fallback to Groq) turns the
     3-field briefing into a structured design brief (visual style,
     color palette hint, tagline direction). Returns JSON.
  2. `logo_candidates` — 3 parallel Flux Schnell calls with variant
     prompts derived from the brief. Images saved via the existing
     image-provider pipeline (Pollinations fallback wired in).
  3. `motto_and_voice` — Claude generates 3 motto candidates (≤7
     words each) + a 2-sentence brand-voice description.
- Output schema: `{ logos: AssetImage[], mottos: AssetText[],
  voice: AssetText }`.

### [FE] Agent-driven event card
**Target**: `components/ceo/agents/AgentEventCard.tsx` (new),
`components/ceo/EventCard.tsx` (update — route milestone events with
`agentWorkflowId` through the new component)
**Action**: Create/Update
**Requirements**:
- When a milestone event has
  `agentWorkflowId: 'brand.package'` in its metadata, render the
  AgentEventCard instead of the 3-choice picker.
- AgentEventCard embeds `<BriefingForm>` + `<WorkflowRunner>` from
  the primitive.
- Candidates shown in a 3-column grid (1-column on mobile).
- Each candidate has tap-to-select; Accept button enables when both
  logo AND motto are chosen.

### [API] Wire milestone → agent routing
**Target**: `app/api/ceo/register/route.ts`,
`lib/ceo/eventEngine.ts`
**Action**: Update
**Requirements**:
- When generating a BRAND milestone event, attach
  `agentWorkflowId: 'brand.package'` and set the event's choices to
  the standard 3-choice placeholder (for kids whose agent isn't
  hired yet, the fallback is the legacy picker).
- Add a per-kid feature flag `ceoBrandAgentEnabled` defaulting `true`
  for new registrations. Existing in-flight businesses stay on the
  legacy picker to avoid mid-arc surprise.

### [FE] Business dashboard — brand card
**Target**: `components/ceo/BusinessDashboard.tsx`
**Action**: Update
**Requirements**:
- When `business.brandAssets?.logoUrl` exists, show the logo in the
  dashboard header (32×32 rounded) next to the business name.
- New "Brand" expandable card with the motto + voice text.
- Empty state ("your Design Agent hasn't shipped yet") shown until
  the BRAND milestone resolves.

### [FE] Telegram bot parity
**Target**: `lib/bot/modules/ceo.ts`
**Action**: Update
**Requirements**:
- Telegram can't render a briefing form natively, so the bot renders
  the BRAND agent flow as a guided multi-step message:
  1. Bot asks mood → inline keyboard (4 options).
  2. Bot asks audience → inline keyboard (4 options).
  3. Bot asks "one word" → free-text reply (20-char cap).
  4. Runs workflow; sends 3 photo messages with inline "Pick this"
     buttons.
  5. After logo picked, sends 3 text messages with inline buttons for
     motto.
  6. Sends a summary + deep link to the web dashboard.
- Defer any "trace" / X-ray view on Telegram to v1.1 (the web is the
  right surface for that).

### [TEST] Coverage
**Target**:
`lib/ceo/agents/workflows/brandPackage.spec.ts`,
`app/api/ceo/agents/run/route.spec.ts` (extend from primitive story)
**Action**: Create/Update
**Requirements**:
- Brand workflow: stub each tool, assert the brief expansion JSON is
  actually used in the image/motto prompts (not dropped).
- Run route: BRAND-specific smoke test (hire Design Agent, run, see 3
  logos + 3 mottos + 1 voice in the artifact).

## Dependencies
- **KIDCEO-DAILY-RHYTHM** — milestone delivery + dual pending slots.
- **KIDCEO-AGENT-PRIMITIVE** — executor, artifact store, team tab.

## Acceptance criteria
- Kid with a fresh business + BRAND milestone pending runs the Design
  Agent workflow and sees 3 logos + 3 mottos rendered in the play
  surface.
- Accepting one of each writes `brandAssets` to the business doc and
  resolves the BRAND milestone.
- Logo shows on the business dashboard from that moment on.
- Future milestone events in the same business have the motto + voice
  in their prompt context (log-verifiable).
- Workflow trace panel shows all 3 steps with model names + estimated
  cost.
