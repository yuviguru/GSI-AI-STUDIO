# LEARN-001-AI-LAB: "Learn" top-nav section — AI Lab

## Description
Elevates AI literacy to a first-class platform surface. New top-nav
peer to Create / Play / Explore: **Learn**, which houses the AI Lab.

Three layers inside Learn:

1. **Foundations** — 20–30 explainer cards covering core AI concepts
   (LLM, prompt, token, temperature, hallucination, embeddings, tool
   use, agents, etc.). Each card is ≤200 words + one interactive demo.
   Aligned to the CBSE AI curriculum Class 9–12 outcomes.
2. **Try It** — curated embeds of free, kid-safe AI tools:
   - Hugging Face Spaces (iframe whitelist)
   - Transformers.js demos running locally in-browser (zero-cost,
     works offline after first load)
   - Teachable Machine (Google, free, zero-code ML training)
3. **Workshop** — guided mini-labs where a kid does a full
   mini-project (e.g. "Train a classifier to recognize your
   handwriting in 5 minutes"). Each workshop unlocks AI Points +
   badges.

Kid CEO deep-links bidirectionally with Learn — every agent's trace
has a "Learn more about this tool" link into the matching Foundation
card.

## Open decisions captured with defaults
1. Unlock progression → **all 3 layers visible always**, but specific
   cards unlock by CBSE class grade (default 9) or via completing
   earlier cards. Keeps day-1 discovery broad.
2. Transparency depth on Foundation cards → **both** — kid-friendly
   paraphrase up top, "See the real thing" toggle opens the actual
   prompt / model call.
3. Embeds → **iframe with sandbox + CSP**, curated allowlist
   (`hf.co/spaces/*`, specific origins). Zero dynamic loading from
   untrusted sources.
4. Transformers.js model size → **≤50 MB** initial load. Larger
   models gated behind "download this model (200 MB)" kid-
   acknowledged click.
5. Session model downloads → cached in IndexedDB so subsequent visits
   are instant and offline.

## Requires KB Updates
- `docs/prd.md` — new "Learn" product surface section with the three-
  layer structure.
- `docs/architecture.md` — new section on the Lab: iframe security
  model, Transformers.js hosting pattern, CBSE mapping.
- `docs/data-model.md` — `learnProgress/{kidId}` doc storing completed
  cards + workshop state.
- `docs/security.md` — iframe sandbox + CSP allowlist + Transformers.js
  origin isolation.
- `docs/ux-patterns.md` — "Foundation card" pattern (structure of an
  explainer + interactive demo pair).

## Subtasks

### [KB] Curriculum mapping
**Target**: `lib/learn/cbseMap.ts`
**Action**: Create
**Requirements**:
- Maps each Foundation card ID to one or more CBSE curriculum
  outcomes (Class 9 / 10 / 11 / 12 AI & Computational Thinking
  strands).
- Canonical source for the CBSE curriculum tags. Tests assert every
  card has at least one CBSE tag.

### [LIB] Content + metadata
**Target**: `lib/learn/content.ts`, `content/learn/*.mdx`
**Action**: Create
**Requirements**:
- MDX-based content, 1 file per Foundation card.
- Frontmatter: `title`, `cbseTags`, `estimatedMinutes`,
  `interactive` ({`type`, `props`}), `prerequisites`.
- Initial deliverable: 8 cards covering the essentials (LLM, prompt,
  token, temperature, hallucination, tool use, agent, embedding).
  The remaining 20+ cards land as content-only follow-ups without
  needing new code.

### [LIB] Embed registry + security
**Target**: `lib/learn/embeds.ts`
**Action**: Create
**Requirements**:
- `EMBED_REGISTRY: EmbedDescriptor[]` — curated Hugging Face Spaces
  list. Each entry: `id`, `title`, `hfPath`, `cbseTags`, `safety`.
- Hardcoded CSP in `next.config.js` limits iframe `src` to
  whitelisted origins.

### [LIB] Transformers.js loader
**Target**: `lib/learn/transformers.ts`
**Action**: Create
**Requirements**:
- Dynamic-import `@xenova/transformers` (or successor); pins model
  revisions.
- Tracks model size, surfaces a size hint before download.
- Uses IndexedDB cache (default behaviour of the lib).

### [FE] Top-nav update
**Target**: `components/layout/SidebarNav.tsx`,
`app/(public)/layout.tsx`
**Action**: Update
**Requirements**:
- Add "Learn" nav entry (icon: book or lightbulb). Positions between
  Explore and the profile dropdown on desktop; bottom-nav peer on
  mobile.
- Simple route structure: `/learn` (index),
  `/learn/foundations/[id]`, `/learn/try/[embedId]`,
  `/learn/workshops/[id]`.

### [FE] Learn index + Foundation page
**Target**: `app/(public)/learn/page.tsx`,
`app/(public)/learn/foundations/[id]/page.tsx`
**Action**: Create
**Requirements**:
- Index page: tabbed UI (Foundations / Try It / Workshop).
- Foundation detail page renders the MDX card with the interactive
  demo component inline.
- Progress indicator pulls from `learnProgress`.

### [FE] Try It embed viewer
**Target**: `app/(public)/learn/try/[embedId]/page.tsx`,
`components/learn/EmbedFrame.tsx`
**Action**: Create
**Requirements**:
- Sandboxed iframe (`sandbox="allow-scripts allow-same-origin"`),
  responsive sizing, loading state, fallback ("this tool is
  temporarily unavailable, try another").

### [FE] Cross-link from Kid CEO trace
**Target**:
`components/ceo/agents/WorkflowTrace.tsx` (update from
KIDCEO-AGENT-PRIMITIVE)
**Action**: Update
**Requirements**:
- Each trace step has a "Learn about this" link; for Claude / Flux
  / Groq steps, link to the matching Foundation card.

### [TEST] Coverage
**Target**: `lib/learn/cbseMap.spec.ts`, `lib/learn/embeds.spec.ts`
**Action**: Create
**Requirements**:
- CBSE map: every foundation card has ≥1 tag.
- Embeds: CSP assertion (no embed URL outside the allowlist).

## Dependencies
- None for the shell — ships standalone.
- Kid CEO cross-links (the WorkflowTrace update) depend on
  **KIDCEO-AGENT-PRIMITIVE** landing first. Can ship in parallel and
  be wired when both are ready.

## Acceptance criteria
- "Learn" nav entry visible platform-wide.
- Kid can open 8 Foundation cards, each with an interactive demo.
- Kid can try ≥5 curated Hugging Face Spaces inside an iframe.
- Transformers.js-based demo runs on-device (no server call) and
  caches for subsequent visits.
- WorkflowTrace in Kid CEO links to the matching Foundation card.
- Progress per kid persists in Firestore and appears as a small
  dashboard on the Learn index.
