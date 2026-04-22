# KIDCEO-AGENT-PRIMITIVE: Agent + workflow execution primitive

## Description
Ships the core `lib/ceo/agents/` primitive that every Kid CEO agent
story stands on: a typed, testable, reusable pattern for "agent runs a
workflow, produces artifacts, kid reviews/accepts, artifacts persist".
This story produces ZERO kid-visible surface — it's the infrastructure
story. `KIDCEO-AGENT-001-BRAND` is the first consumer and proves the
primitive end-to-end.

The primitive covers:
- **Agent descriptor**: id, name, unlock phase, salary (₹/day), supported
  tasks, supported tools, pricing (regeneration cost).
- **Workflow descriptor**: ordered steps, each step = (tool + prompt
  template + output schema). Composable; a workflow can call another
  workflow.
- **Executor**: runs a workflow, returns structured artifacts + a
  trace (every step's input/output/model/cost for the X-ray view).
- **Artifact store**: Firestore `ceoArtifacts` collection — the kid
  can read their own artifacts forever (including after sim end).
- **Briefing schema**: every workflow declares what inputs it needs
  (mood, audience, budget, etc.) so the UI can render a consistent
  briefing form.

## Open decisions captured with defaults
1. Briefing format → **hybrid** (2 multiple-choice + 1 free-text).
   Scaffolds young kids, still teaches prompt-writing.
2. Regeneration cost → **in-sim cash** (₹50–100 / run depending on
   agent tier), 1 free re-roll per milestone. Teaches cost awareness.
3. Artifact export → **always available** — kids can download
   their logos/posters/etc. from the business dashboard.
4. Workflow trace visibility → **collapsed by default**, tap "Show me
   how this worked" to expand. Keeps the surface clean but teaches
   transparency on demand.

## Requires KB Updates
- `docs/data-model.md` — new collections:
  - `ceoAgents` (config seed, not per-kid — read-only catalog)
  - `ceoAgentHires` (`kidId`, `businessId`, `agentId`, `hiredAt`,
    `config { focus, aggressiveness }`, `salary`, `status`).
  - `ceoArtifacts` (`kidId`, `businessId`, `agentHireId`, `workflowId`,
    `trace`, `assets { type, url, metadata }`, `decisionEventId?`,
    `createdAt`).
  - `ceoBusiness.brandAssets` — `{ logoUrl, motto, voice, palette? }`,
    first agent-produced artifact that lives on the business doc
    (because it's referenced in EVERY future event prompt).
- `docs/api-contracts.md` — new endpoints (shape documented here;
  implementation is in per-agent stories):
  - `POST /api/ceo/agents/hire` — hire an unlocked agent for a
    business.
  - `POST /api/ceo/agents/run` — kid submits a briefing, runs a
    workflow, returns artifacts + trace.
  - `POST /api/ceo/agents/accept` — kid accepts a generated artifact;
    persisted to `ceoArtifacts` and attached to the relevant event or
    business field.
  - `GET /api/ceo/agents/hires?businessId=...` — list active hires.
  - `GET /api/ceo/artifacts?businessId=...` — paginated artifact feed.
- `docs/architecture.md` — new "Kid CEO Agent Primitive" section
  describing the executor, trace, and tool-adapter pattern.
- `docs/security.md` — briefing inputs run through `filterInput`; all
  generated artifacts (text + image captions) run through
  `filterOutput` before persist.

## Subtasks

### [KB] Types + schema
**Target**: `types/ceo.types.ts`, `types/index.ts`
**Action**: Update
**Requirements**:
- `CeoAgentId = 'design' | 'marketing' | 'ops' | 'finance' | 'customer_success' | 'product'`.
- `CeoAgentDescriptor { id, name, emoji, unlockPhase, salaryPerDay,
  tagline, tools: CeoAgentTool[], workflows: CeoWorkflowId[] }`.
- `CeoAgentHire { id, kidId, businessId, agentId, config, salary,
  status: 'active'|'paused'|'dismissed', hiredAt, updatedAt }`.
- `CeoWorkflowId = 'brand.package' | 'marketing.poster' |
  'ops.schedule' | ...` (union — each agent story adds IDs).
- `CeoWorkflowStepTrace { stepId, tool, model, promptTokens,
  completionTokens, costInr, inputSummary, outputSummary, latencyMs }`.
- `CeoArtifact { id, kidId, businessId, agentHireId, workflowId,
  trace: CeoWorkflowStepTrace[], assets: CeoArtifactAsset[],
  status: 'candidate'|'accepted'|'rejected'|'expired', createdAt }`.
- `CeoArtifactAsset = { type: 'image', url, caption, altText } |
  { type: 'text', kind: 'motto'|'voice'|'post'|..., content } |
  { type: 'palette', colors: string[] }`.

### [LIB] Agent catalog (seed)
**Target**: `lib/ceo/agents/catalog.ts`
**Action**: Create
**Requirements**:
- Exports `AGENT_CATALOG: CeoAgentDescriptor[]` — the six agents
  defined in the design (Design, Marketing, Ops, Finance, Customer
  Success, Product).
- No Firestore seed needed — the catalog lives in code. Kid-visible
  catalog reads from this export via a thin API route.
- Each agent references workflow IDs; the workflow registry
  (next subtask) resolves those to executables.

### [LIB] Workflow registry + executor
**Target**: `lib/ceo/agents/workflows/index.ts`,
`lib/ceo/agents/executor.ts`
**Action**: Create
**Requirements**:
- `WORKFLOW_REGISTRY: Record<CeoWorkflowId, WorkflowSpec>` where
  `WorkflowSpec = { id, agentId, briefingSchema, steps, outputSchema }`.
- `executeWorkflow(input: { spec, brief, business, kidId })` returns
  `{ assets, trace }`. Wraps every tool call with a timing +
  cost-estimate wrapper so the trace is populated consistently.
- Tool adapters live under `lib/ceo/agents/tools/` — one file per
  tool (`claude.ts`, `groq.ts`, `fluxSchnell.ts`, `pollinations.ts`,
  `transformersJs.ts`). Each exports a `runTool(input)` with a
  uniform shape.
- Fails closed: if ANY step fails, the executor returns the partial
  trace and a typed `WorkflowExecutionError` so the UI can show
  "something went wrong at step X — here's what we got so far".

### [LIB] Artifact store
**Target**: `lib/firebase/ceoArtifactService.ts`
**Action**: Create
**Requirements**:
- `saveCandidateArtifact(artifact)` — writes to `ceoArtifacts` with
  `status: 'candidate'`. Returns saved artifact with Firestore-assigned
  ID.
- `acceptArtifact(artifactId, attachTo?: { event?: 'field', businessField?: 'brandAssets' })`
  — atomic update: sets status to `'accepted'` AND (optionally) writes
  accepted fields onto the parent business doc or the deciding event.
  Prevents duplicate accepts via transaction.
- `rejectArtifact(artifactId)` — sets status to `'rejected'`.
- `listArtifactsForBusiness(businessId, { limit?, status? })`.
- `getArtifact(artifactId)` with ownership check (kidId match).

### [API] Hire / run / accept endpoints
**Target**: `app/api/ceo/agents/hire/route.ts`,
`app/api/ceo/agents/run/route.ts`,
`app/api/ceo/agents/accept/route.ts`,
`app/api/ceo/agents/hires/route.ts`,
`app/api/ceo/artifacts/route.ts`
**Action**: Create
**Requirements**:
- Standard API pattern (`lib/api-utils.ts`): auth via
  `requireAuthWithKid`, Zod validation via new
  `lib/validators.ts#ceoAgentHireSchema` etc.
- `/hire` — validates agent is unlocked for the business's phase,
  writes `ceoAgentHires`, deducts first-day salary (in-sim cash).
- `/run` — validates a valid hire + workflow, runs
  `executeWorkflow`, saves candidate artifact, returns artifact +
  trace. Regeneration cost deducted on each run after the first free
  re-roll per milestone.
- `/accept` — saves as accepted + atomic attach to business/event.

### [FE] Briefing form + workflow runner
**Target**: `components/ceo/agents/BriefingForm.tsx`,
`components/ceo/agents/WorkflowRunner.tsx`,
`components/ceo/agents/ArtifactCandidateCard.tsx`,
`components/ceo/agents/WorkflowTrace.tsx`
**Action**: Create
**Requirements**:
- `BriefingForm` — renders the current `briefingSchema` (2 MC + 1
  free-text pattern). Uses `react-hook-form` consistent with the rest
  of the codebase.
- `WorkflowRunner` — coordinates submit → loading state (shows a
  progress-style tool-step visualization) → accept/reject → commit.
  Hits `/run` then either `/accept` or `/run` again (re-roll).
- `WorkflowTrace` — collapsible panel under each artifact that shows
  the tool chain used, tokens, cost estimate, and the raw prompt for
  each step. Educational; this is how we teach agentic workflows.

### [FE] Team tab shell
**Target**: `components/ceo/TeamTab.tsx`,
`app/(public)/ceo/play/page.tsx`
**Action**: Create/Update
**Requirements**:
- New "Team" tab at the top of the play surface (sibling to existing
  content).
- Renders `AgentCard` for each unlocked agent (hired or hireable).
- Hired agents show current focus, recent artifacts, a "Give task"
  button that opens the workflow chooser.
- Hireable agents show "Hire for ₹X/day" with a short tagline.
- Tab visibility gated on `business.phase !== 'pre_launch'` — ensures
  kid earns the Team tab by answering their first milestone.

### [TEST] Coverage
**Target**: `lib/ceo/agents/executor.spec.ts`,
`lib/firebase/ceoArtifactService.spec.ts`,
`app/api/ceo/agents/run/route.spec.ts`
**Action**: Create
**Requirements**:
- Executor: happy-path workflow with a stub tool adapter; failure at
  step 2 → trace includes steps 0 and 1 intact; unknown workflow ID →
  typed error.
- Artifact service: concurrent `acceptArtifact` calls race-test; only
  one succeeds, the other sees `'accepted'` and no-ops.
- Run route: ownership (kid must own the business), regeneration
  cost deduction, free re-roll logic.

## Dependencies
- **KIDCEO-DAILY-RHYTHM** (dual pending slots so agent-produced
  milestone artifacts don't block regulars).

## Acceptance criteria
- `executeWorkflow` runs a two-step stub workflow with deterministic
  output and returns a trace with both steps populated.
- Hire + run + accept flow produces a `ceoArtifacts` doc with
  `status: 'accepted'` and attaches the accepted assets to the target.
- Kid sees the Team tab only after leaving pre_launch phase.
- Trace view renders the prompt for each step in a kid-readable way.
