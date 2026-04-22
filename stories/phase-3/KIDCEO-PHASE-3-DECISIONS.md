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
| D1 | Milestone delivery time | _tbd_ | | |
| D2 | Regular cap reset time | _tbd_ | | |
| D3 | Expired milestone penalty | _tbd_ | | |
| D4 | Regular auto-chain after decide | _tbd_ | | |
| D5 | Telegram mirror of pull | _tbd_ | | |
| A1–A5 | Agent primitive calls | _tbd_ | | |
| B1–B5 | BRAND agent calls | _tbd_ | | |
| C1–C2 | Marketing agent calls | _tbd_ | | |
| E1–E3 | Ops / Finance agent calls | _tbd_ | | |
| W1–W4 | Workflow builder calls | _tbd_ | | |
| L1–L5 | AI Lab calls | _tbd_ | | |
| P1–P3 | Pace options | _tbd_ | | |
