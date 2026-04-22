# KIDCEO-PHASE-3-DECISIONS: Open product decisions + sequencing

This doc is the single place to **pin answers** for everything we
designed across Daily Rhythm + Agents + AI Lab + Workflow Builder.
Each story files it as "captured with default" — nothing ships
unless the defaults here are confirmed or overridden.

## Decisions to confirm (tick one per row or override)

### Daily Rhythm — [KIDCEO-DAILY-RHYTHM](./KIDCEO-DAILY-RHYTHM.md)

| # | Decision | Default | Alternative |
|---|---|---|---|
| D1 | Milestone delivery time | **18:30 IST** (after-school) | 07:00 IST (breakfast) |
| D2 | Regular cap reset time | **IST midnight** | IST noon |
| D3 | Expired milestone penalty | **0 impact** (neutral) | Small rep hit (-2) |
| D4 | Regular auto-chain after decide | **Drop** (pull-only) | Keep the current chaining |
| D5 | Telegram mirror of pull | **Same model** via `/ceo` button | Keep bot as push-only |

### Agent Primitive — [KIDCEO-AGENT-PRIMITIVE](./KIDCEO-AGENT-PRIMITIVE.md)

| # | Decision | Default | Alternative |
|---|---|---|---|
| A1 | Briefing form format | **Hybrid**: 2 MC + 1 free-text | All MC (simpler) / all free-text (deeper) |
| A2 | Regeneration cost | **₹50/run** after 1 free re-roll per milestone | Free unlimited |
| A3 | Artifact export | **Always on** (kid keeps after sim ends) | Gated by phase |
| A4 | Trace visibility | **Collapsed by default**, tap to expand | Always expanded |
| A5 | Tab unlock | **Team tab visible once `phase !== pre_launch`** | Always visible |

### Agent catalog + unlocks

| # | Decision | Default | Alternative |
|---|---|---|---|
| B1 | BRAND Agent — pilot first? | **Yes** — smallest blast radius, visual payoff | Marketing Agent first |
| B2 | Logo candidates per run | **3** | 4 (more variety, +33% cost) |
| B3 | Motto candidates per run | **3** | Same as logos |
| B4 | Brief mood options | **playful / serious / bold / dreamy** | + "mysterious", "warm", "clean" |
| B5 | Free-text field length | **20 chars** (design), 25 (marketing) | Taller (40+) |
| C1 | Marketing Agent unlock | **Launch phase** | Pre-launch (earlier delegation) |
| C2 | Marketing "post this" cap | **+3 reputation per IST day** across all posts | Per-post cap |
| E1 | Ops Agent unlock | **Launch phase** | Early growth |
| E2 | Finance Agent unlock | **Early growth** (after kid has done PRICING solo once) | Launch |
| E3 | Competitor-scan tool for Finance | **Brave Search free tier** (1000 q/mo) | Skip, rely on LLM reasoning |

### Workflow Builder — [KIDCEO-WORKFLOW-BUILDER](./KIDCEO-WORKFLOW-BUILDER.md)

| # | Decision | Default | Alternative |
|---|---|---|---|
| W1 | Unlock phase | **Scale** | Mature (later) / Early growth (earlier) |
| W2 | Canvas engine | **React Flow** (`@xyflow/react`, MIT) | Pure Tailwind custom impl |
| W3 | Trigger vocabulary | **~8 curated triggers** (closed enum) | Open-ended, with approval step |
| W4 | Tool vocabulary | **Same adapters as primitive** | Open to any HF Space |

### AI Lab — [LEARN-001-AI-LAB](./LEARN-001-AI-LAB.md)

| # | Decision | Default | Alternative |
|---|---|---|---|
| L1 | Top-nav placement | **"Learn" peer to Create/Play/Explore** | Nested under a Profile menu |
| L2 | Foundation unlock model | **All visible day-1**, card-gated prerequisites | Grade-gated (CBSE class) |
| L3 | Embed allowlist | **Hardcoded CSP in next.config.js** | Dynamic allowlist in Firestore |
| L4 | Transformers.js size gate | **50 MB auto-download**, prompt for >50 MB | No gate (any size) |
| L5 | Initial Foundation cards | **8 (LLM, prompt, token, temperature, hallucination, tool use, agent, embedding)** | More (20+) at launch |

### Pace options

| # | Decision | Default | Alternative |
|---|---|---|---|
| P1 | Available paces | **15 / 30 / 45 days** (as today) | Add 60 / 90 for deeper play |
| P2 | Arc length = milestones count | **Yes** — 1 milestone/day, ends at pace-days | Fixed 19-milestone arc regardless of pace |
| P3 | Milestone content for longer paces | **Hybrid**: 19 structured backbone + LLM-generated extensions | Pure procedural (drop structured list) |

## Recommended shipping order

1. **KIDCEO-DAILY-RHYTHM** (prerequisite for everything else; ~1.5–2 wks)
2. **KIDCEO-AGENT-PRIMITIVE** (infrastructure story, no kid-visible changes; ~1.5 wks)
3. **KIDCEO-AGENT-001-BRAND** (first kid-facing agent, POC end-to-end; ~1 wk)
4. **LEARN-001-AI-LAB** (can ship in parallel with #3; ~2 wks)
5. **KIDCEO-AGENT-002-MARKETING** + **KIDCEO-AGENT-003-OPS-FINANCE** (parallelisable; ~1 wk each)
6. **KIDCEO-WORKFLOW-BUILDER** (gates on ≥3 agents shipped; ~2 wks)

Total: ~8–10 weeks of focused work, shipped as 7 PRs.

## What to do with this doc

1. **You** fill in the "confirmed" column (or override). Even one pass of "all defaults fine, ship it" is enough to unblock.
2. **Me** uses your confirmed answers as the canonical source when writing code on each story. Defaults in this doc override anything softer written in the individual story files.
3. Every time we want to re-open a decision, we edit THIS doc and link to it from the affected story.

## Confirmed column

| # | Decision | Chosen | Signed off by | Date |
|---|---|---|---|---|
| D1 | Milestone delivery time | **18:30 IST** (6:30 PM, after-school) | Yuvaraj | 2026-04-22 |
| D2 | Regular cap reset time | **IST midnight** (00:00 Asia/Kolkata) | Yuvaraj | 2026-04-22 |
| D3 | Expired milestone penalty | **Scaling penalty** tied to `MILESTONE_STAKES_MULTIPLIER`: rep −1×M, morale −1×M, cash −₹50×M (cash only when category is cash-adjacent: pricing / funding / competition / capital). Floors at 0. See table below. | Yuvaraj | 2026-04-22 |
| D4 | Regular auto-chain after decide | **Hybrid**: after a milestone → no auto-regular (kid chooses: pull or wait). After a regular → auto-chain next regular until 5/day cap hit. First regular of the day → kid pulls. | Yuvaraj | 2026-04-22 |
| D5 | Telegram mirror of pull | **Yes** — full parity. `/ceo` shows "📋 Take a small decision (N/5 left)" button when appropriate; bot also respects the auto-chain hybrid. | Yuvaraj | 2026-04-22 |
| A1 | Briefing form format | **Hybrid**: 2 MC + 1 short free-text (per-workflow schema) | Yuvaraj | 2026-04-22 |
| A2 | Regeneration cost | **Always charged, per-step, with run-escalation**. Kids see a cost on every run so they learn LLM calls aren't free. See table below. | Yuvaraj | 2026-04-22 |
| A3 | Artifact export | **Always on** — kid keeps their logos/posters/schedules forever, including post-sim | Yuvaraj | 2026-04-22 |
| A4 | Trace visibility | **Collapsed by default**, tap "Show me how this worked" to expand | Yuvaraj | 2026-04-22 |
| A5 | Team tab unlock | **Once `phase !== 'pre_launch'`** — kid earns it by answering their first milestone | Yuvaraj | 2026-04-22 |
| B1–B5 | BRAND agent calls | _tbd — Batch 3_ | | |
| C1–C2 | Marketing agent calls | _tbd — Batch 4_ | | |
| E1–E3 | Ops / Finance agent calls | _tbd — Batch 4_ | | |
| W1–W4 | Workflow builder calls | _tbd — Batch 5_ | | |
| L1–L5 | AI Lab calls | _tbd — Batch 6_ | | |
| P1–P3 | Pace options | _tbd — Batch 6_ | | |

### A2 confirmed pricing model

**Per-tool step cost** (the trace shows this on every run — teaches kids that each LLM/image call has a cost):

| Tool | In-sim ₹ / call |
|---|---|
| Claude text generation | ₹5 |
| Groq text generation | ₹2 |
| Flux Schnell / SDXL image | ₹8 per image |
| Brave Search | ₹3 per query |
| Transformers.js (in-browser) | **₹0** (runs on the kid's device — free forever; explicit teaching moment) |
| Deterministic compute (break-even math etc.) | ₹0 |

**Run-escalation multiplier** applies to the summed step cost per workflow run:

| Run # | Multiplier | Rationale |
|---|---|---|
| 1 (first attempt) | **1.0×** | Cheapest — kid commits to their brief |
| 2 (first re-roll) | **1.5×** | "Try again" carries a nudge |
| 3 | **2.0×** | Escalates fast enough that kids re-read their brief before re-rolling |
| 4+ | **2.5× (cap)** | Cap — never punishing beyond this |

Counter resets when the kid accepts or rejects the whole workflow (closing the "attempt session"). Running a different workflow starts fresh.

**Worked examples**:
- **BRAND package** (Claude ₹5 + 3 × Flux ₹8 + Claude ₹5 = ₹34 base):
  Run 1 = ₹34, Run 2 = ₹51, Run 3 = ₹68, Run 4+ = ₹85 (cap)
- **Marketing first campaign** (Claude ₹5 + 3 × Flux ₹8 + Claude ₹5 = ₹34 base): same curve
- **Ops daily check** (1 Claude call, ₹5 base): ₹5 / ₹8 / ₹10 / ₹13 — very cheap
- **Finance cash check** (deterministic + 1 Claude prose, ₹5 base): same as Ops

Starting capital ranges ₹2,000–₹3,000, so even a 4-re-roll BRAND session (~₹238 total) is meaningful but not game-breaking.

### D3 confirmed penalty table

| Milestone tier | Example milestones | Rep delta | Morale delta | Cash delta (cash-adjacent categories only) |
|---|---|---|---|---|
| 2× (minor) | EARLY_FEEDBACK, LEGACY | −2 | −2 | −₹100 |
| 3× (standard) | BRAND, LOCATION, FIRST_CUSTOMERS, OPERATIONS_SETUP, RETENTION, FIRST_HIRE, WORD_OF_MOUTH, TEAM_GROWTH, STRATEGIC_PIVOT | −3 | −3 | −₹150 |
| 5× (pillar / crisis) | FUNDING_STANCE, PRICING, CAPITAL_STRATEGY, COMPETITION, EXPANSION, EXIT_STRATEGY, SUPPLIER_RELATIONSHIP | −5 | −5 | −₹250 |

Cash-adjacent categories (from `CEO_EVENT_CATEGORIES` in `lib/ceo/constants.ts`): `pricing`, `funding`, `competition`, `capital`, `ops` (when supplier/inventory). Non-cash categories (brand, marketing-reputation, people-morale, customer-service) apply rep + morale penalties only.

All deltas floor at 0 so a skipping streak cannot push cash / rep / morale below 0.
