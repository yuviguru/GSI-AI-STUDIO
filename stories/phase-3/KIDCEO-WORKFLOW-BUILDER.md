# KIDCEO-WORKFLOW-BUILDER: Scratch-style agentic workflow builder

## Description
The payoff story. Kid has interacted with ≥3 agents, seen their traces,
and understood the "brief → tool → output" pattern. Now they build
their own agents by chaining workflow steps visually.

Surface: a new drag-and-drop canvas on the Team tab (unlocks at
**Scale phase**) where kids pick a trigger, a tool, and an output
destination, wire them up, and save as a custom workflow their agents
can run.

Example: "When a customer leaves negative feedback → run sentiment on
the text → if score < 0.3 → generate apology post with Marketing
Agent → post automatically to Marketing tab."

This is real prompt-engineering + orchestration at a 12-year-old level.
Equivalent to LangChain / n8n / Zapier mental models, but kid-safe and
bounded.

## Open decisions captured with defaults
1. Canvas engine → **React Flow** (MIT, popular, already integrates
   cleanly with Tailwind / Next.js).
2. Trigger vocabulary → a curated, finite list (~8 triggers). No
   free-form "run when X" — bounds LLM exposure and scope.
3. Tool vocabulary → the same tool adapters the primitive already
   ships. No new tools introduced here.
4. Workflow execution → **same executor** from the primitive; the
   builder is just a UI layer that produces a `WorkflowSpec` JSON
   that the executor runs.
5. Unlock phase → **Scale**. Tied to the kid's proven readiness —
   they've successfully delegated through 3 phases before unlocking
   orchestration.

## Requires KB Updates
- `docs/data-model.md` — `ceoCustomWorkflows` collection (`kidId`,
  `businessId`, `name`, `trigger`, `spec` — JSON-serialised
  `WorkflowSpec`, `status`, `createdAt`, `updatedAt`).
- `docs/api-contracts.md` — CRUD endpoints for custom workflows +
  an execution endpoint.
- `docs/architecture.md` — clarify that custom workflows are
  serialised `WorkflowSpec`s executed by the same engine the
  built-in workflows use. No separate runtime.
- `docs/security.md` — custom-workflow prompts run through
  `filterInput` before save; outputs run through `filterOutput`;
  the finite trigger / tool vocabulary prevents injection.

## Subtasks

### [LIB] Custom workflow schema + storage
**Target**: `types/ceo.types.ts`,
`lib/firebase/ceoCustomWorkflowService.ts`
**Action**: Update/Create
**Requirements**:
- `CeoCustomWorkflow` type with serialisable `spec` field.
- Service methods: `createCustomWorkflow`, `listForBusiness`,
  `getCustomWorkflow`, `updateCustomWorkflow`, `deleteCustomWorkflow`.
- Ownership enforcement (kidId must match).

### [LIB] Trigger evaluator
**Target**: `lib/ceo/agents/triggers.ts`
**Action**: Create
**Requirements**:
- A typed registry of triggers, each with:
  - `id` (e.g. `'customer_feedback_negative'`)
  - `name` (kid-facing)
  - `evaluate(context): boolean` — pure predicate over the business
    + current event context.
- Triggers evaluated after every decided event; matching custom
  workflows run asynchronously (fire-and-forget, result lands in
  artifact feed).

### [API] Custom workflow CRUD + run
**Target**: `app/api/ceo/workflows/custom/route.ts`,
`app/api/ceo/workflows/custom/[id]/route.ts`,
`app/api/ceo/workflows/custom/[id]/run/route.ts`
**Action**: Create
**Requirements**:
- POST /custom — create (validates spec via new Zod schema).
- GET /custom?businessId=... — list.
- GET/PATCH/DELETE /custom/:id — standard.
- POST /custom/:id/run — manual trigger (bypasses the trigger
  evaluator — useful for testing).

### [FE] React Flow canvas
**Target**: `components/ceo/workflows/WorkflowBuilder.tsx`,
`components/ceo/workflows/nodes/*.tsx`
**Action**: Create
**Requirements**:
- Add `@xyflow/react` dependency.
- Node types: `TriggerNode`, `ToolNode`, `OutputNode`. Each node
  surfaces its config in a side panel when selected.
- Left-side palette shows available triggers / tools grouped by
  agent.
- Bottom toolbar: Save / Test-run / Delete.
- Serialises to `WorkflowSpec` on save.

### [FE] Team tab integration
**Target**: `components/ceo/TeamTab.tsx`
**Action**: Update
**Requirements**:
- New section at top of Team tab (post-Scale): "Your custom
  workflows". List of custom workflows with enable/disable toggle
  and "Open builder" CTA.

### [TEST] Coverage
**Target**:
`lib/ceo/agents/triggers.spec.ts`,
`lib/firebase/ceoCustomWorkflowService.spec.ts`,
`components/ceo/workflows/WorkflowBuilder.spec.tsx`
**Action**: Create
**Requirements**:
- Triggers: each predicate tested against a synthetic business
  context.
- Service: ownership violations rejected; spec validation (no
  cycles, known trigger/tool IDs only).
- Builder: save round-trip produces a spec that the executor runs
  to completion (stubbed tools).

## Dependencies
- **KIDCEO-AGENT-PRIMITIVE**, **KIDCEO-AGENT-001-BRAND**,
  **KIDCEO-AGENT-002-MARKETING**, **KIDCEO-AGENT-003-OPS-FINANCE**
  (kid has seen ≥3 agents in action before the builder unlocks).

## Acceptance criteria
- Scale-phase kid sees a "Build your own workflow" CTA on Team tab.
- Dragging a trigger + tool + output onto the canvas and saving
  produces a stored `ceoCustomWorkflows` doc.
- The trigger evaluator fires the workflow on matching events; the
  result lands in the artifact feed tagged `source: 'custom'`.
- Test-run button executes the workflow with a synthetic context
  and shows the trace inline.
