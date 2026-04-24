# KIDCEO-AGENT-003-OPS-FINANCE: Ops + Finance agents

## Description
Adds two more agents on the same primitive, bringing the Team tab to
4 agents (Design, Marketing, Ops, Finance) which covers the "core four"
functional areas a kid founder would realistically delegate first.

- **Ops Agent** — runs `ops.scheduleCheck` (daily schedule + checklist
  artifact) and handles the OPERATIONS_SETUP milestone via
  `ops.setupPackage` (hours plan, cleanliness checklist, basic
  division-of-labour card).
- **Finance Agent** — runs `finance.cashCheck` (weekly cash health
  summary) and handles the PRICING milestone via
  `finance.pricingPackage` (competitor scan, 3 pricing strategy
  candidates, break-even calculator output).

Both agents introduce **structured tool outputs** — the Finance Agent
specifically uses a deterministic break-even math step (not LLM) so
kids see that "agents don't always mean LLM — sometimes it's a
calculator, sometimes it's a database query". Educational.

## Open decisions captured with defaults
1. Ops agent unlock → **Launch phase**.
2. Finance agent unlock → **Early growth phase** (after PRICING has
   been handled once without an agent — teaches the tradeoff of
   deciding yourself vs delegating).
3. Free-tier pricing-scan tool → **Web search via Brave API free tier**
   (1000 queries/mo free). Fallback: skip the scan step, rely purely
   on business-context reasoning.
4. Salary tiers → Design/Marketing ₹50/day, Ops ₹40/day, Finance
   ₹60/day (Finance costs most because it has the highest leverage).

## Requires KB Updates
- `docs/data-model.md` — `CeoArtifactAsset` extends with
  `{ type: 'schedule', days: DaySlot[] }`,
  `{ type: 'pricing_strategy', price: number, rationale: string }`,
  `{ type: 'checklist', items: string[] }`.
- `docs/api-contracts.md` — workflow IDs `ops.setupPackage`,
  `ops.scheduleCheck`, `finance.pricingPackage`, `finance.cashCheck`.
- `docs/architecture.md` — call out the "non-LLM tool" pattern used
  by Finance's break-even step.

## Subtasks

### [LIB] Ops workflows
**Target**: `lib/ceo/agents/workflows/opsSetupPackage.ts`,
`lib/ceo/agents/workflows/opsScheduleCheck.ts`
**Action**: Create
**Requirements**:
- `ops.setupPackage` — OPERATIONS_SETUP milestone. Briefing:
  `daysOpen` (MC: weekends-only / weekdays-after-school / both),
  `shiftsNeeded` (MC: just-me / with-helper). Steps:
  1. Claude → hours plan JSON (per-day open/close).
  2. Claude → cleanliness + quality checklist (5–8 items).
  3. Claude → "who does what" division card.
- `ops.scheduleCheck` — lightweight run, daily cap 1/day, no
  milestone attachment. Takes current `business.employees` + current
  `dailyRegularEventCount` and returns a fresh 3-item checklist for
  "today's priorities".

### [LIB] Finance workflows
**Target**: `lib/ceo/agents/workflows/financePricingPackage.ts`,
`lib/ceo/agents/workflows/financeCashCheck.ts`
**Action**: Create
**Requirements**:
- `finance.pricingPackage` — PRICING milestone. Briefing: `strategy`
  (MC: volume / premium / mixed), `targetMargin` (MC: tight / fair /
  fat). Steps:
  1. (Optional) Brave Search → competitor price scan; falls back to
     "no data" if API missing or throttled.
  2. Claude → 3 pricing-strategy candidates each with a price, a
     rationale, and a projected-customers count.
  3. **Deterministic breakEven step** — pure TS, takes each candidate
     price + `business.startingCapital` + estimated variable costs
     and returns break-even customer count. This is the
     "AI isn't always an LLM" teaching moment.
- `finance.cashCheck` — weekly cap, produces a "traffic light"
  (green/yellow/red) summary based on `currentCash` trajectory
  across the last 7 days' decided events. Pure deterministic — no
  LLM, or Claude only for the prose summary.

### [LIB] Break-even helper
**Target**: `lib/ceo/agents/tools/breakEven.ts`
**Action**: Create
**Requirements**:
- Pure function, unit-tested. Takes
  `{ price, startingCapital, variableCostPerUnit, fixedCostPerDay }`.
- Returns `{ breakEvenUnits: number, daysToBreakEven: number }`.
- Validates inputs, clamps absurd outputs.

### [FE] Tab shells (stacked agent pattern)
**Target**: `components/ceo/OpsTab.tsx`, `components/ceo/FinanceTab.tsx`
**Action**: Create
**Requirements**:
- Follow the Marketing tab pattern. Show current artifacts, allow
  running daily/weekly check, show empty state + hire CTA when agent
  not hired.
- Finance tab additionally renders a small cash chart (reuse
  existing `BusinessDashboard`'s metrics pattern) when there's ≥7
  days of decided events.

### [BOT] Telegram parity
**Target**: `lib/bot/modules/ceo.ts`
**Action**: Update
**Requirements**:
- Same inline-keyboard flow as Marketing / Brand.

### [TEST] Coverage
**Target**:
- `lib/ceo/agents/tools/breakEven.spec.ts` (100% — pure math)
- `lib/ceo/agents/workflows/opsSetupPackage.spec.ts`
- `lib/ceo/agents/workflows/financePricingPackage.spec.ts`
**Action**: Create
**Requirements**:
- Break-even: edge cases (price < cost → negative units →
  clamped error).
- Workflows: brief propagation, `business.brandAssets` context
  inheritance.

## Dependencies
- **KIDCEO-AGENT-PRIMITIVE**
- **KIDCEO-AGENT-001-BRAND** (for `brandAssets` context)
- **KIDCEO-AGENT-002-MARKETING** is NOT a dependency — can ship in
  parallel after the primitive lands.

## Acceptance criteria
- Ops Agent hireable at Launch, handles OPERATIONS_SETUP milestone
  end-to-end with a schedule + checklist + roles artifact.
- Finance Agent hireable at Early Growth, handles PRICING milestone
  with 3 strategy candidates + break-even numbers.
- `breakEven` pure function covered 100% by tests.
- Telegram flows for both agents work under the standard inline-
  keyboard pattern.
