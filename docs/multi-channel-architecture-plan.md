# Multi-Channel Architecture Plan (MCP + Voice + WhatsApp + Web)

**Date**: 2026-05-10
**Status**: Draft for review
**Goal**: Treat the web UI as one of N "channels" — add MCP server, voice agent, WhatsApp bot, etc. as parallel channels without duplicating business logic.

---

## TL;DR

1. **MCP and voice are not separate features — they're separate _channels_ on top of the same domain.** If the backend + AI abstractions are done right, the domain doesn't know or care whether the request came from a React button, a Claude Desktop tool call, a voice transcript, or a WhatsApp message.
2. **MCP is cheap to add** (~3 days) and high leverage — it gets you into Claude Desktop / Cursor / ChatGPT-with-MCP / any agentic IDE. It's also B2B-friendly (schools can integrate into their LMS).
3. **Voice-only is its own product hypothesis** — for India, voice via WhatsApp in vernacular languages (Hindi/Tamil/Telugu) is genuinely transformative for the 8–12 age group who can't type well and whose parents share one phone. But it needs validation, not just engineering. Run a 20-user voice pilot in parallel with the web pilot.
4. **The killer insight**: voice agent IS an MCP client whose "user" is the LLM listening to a kid talk. **Build MCP first; voice gets it for free.**

---

## 1. The Layered Channel Architecture

```
┌────────────────────────────────────────────────────────────┐
│  CHANNELS (one file each, no business logic)               │
│  Web UI │ MCP Server │ Voice Agent │ WhatsApp Bot │ Email  │
└──────────┬─────────────────────────────────────────────────┘
           │
           │ each channel calls
           ▼
┌────────────────────────────────────────────────────────────┐
│  CAPABILITY LAYER (lib/capabilities/)                      │
│  createStory(), createMusic(), createComic(), …            │
│  Pure functions. No HTTP, no transport.                    │
│  This is the "what can the platform do" layer.             │
└──────────┬─────────────────────────────────────────────────┘
           │
           │ uses
           ▼
┌────────────────────────────────────────────────────────────┐
│  REPOSITORIES (lib/repositories/)                          │
│  CreationRepository, SessionRepository, …                  │
└──────────┬─────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────┐
│  PORTS (lib/backend/ports/, lib/ai/ports/)                 │
│  DataStore │ AuthProvider │ StorageProvider │ LlmProvider  │
│  ImageProvider │ AudioProvider                             │
└────────────────────────────────────────────────────────────┘
```

The capability layer is the **new layer** this doc proposes. Today, "generate a story" lives inside `app/api/ai/story/route.ts` mixed with Next.js HTTP plumbing. Extract the orchestration into a pure function so every channel can call it identically.

### Example: extracting `createStory` capability

```ts
// lib/capabilities/createStory.ts

import { llmRouter } from '@/lib/ai/router';
import { imageRouter } from '@/lib/ai/router';
import { saveCreation } from '@/lib/repositories/creationRepository';
import { trackCreation } from '@/lib/repositories/sessionRepository';
import { filterInput, filterOutput } from '@/lib/safety/inputFilter';
import { STORY_SYSTEM_PROMPT, buildStoryUserPrompt } from '@/lib/ai/prompts/storyPrompt';

export interface CreateStoryRequest {
  sessionId: string;
  premise: string;
  characters?: string[];
  setting?: string;
  genre?: string;
  pages?: number;
  ageGroup?: string;
  language?: 'en' | 'hi' | 'ta' | 'te' | 'kn';
  costCeiling?: 'free' | 'cheap' | 'standard' | 'premium';
}

export interface CreateStoryResult {
  creationId: string;
  title: string;
  pages: Array<{ text: string; imageUrl: string; pageNumber: number }>;
  shareUrl: string;
  costUsd: number;
  durationMs: number;
}

/**
 * Pure capability — no HTTP, no Next.js. Callable from any channel:
 * web route, MCP tool, voice agent, WhatsApp bot, email scheduler, cron job.
 */
export async function createStory(req: CreateStoryRequest): Promise<CreateStoryResult> {
  const start = Date.now();
  filterInput(req.premise);

  const llmResult = await llmRouter.generate({
    systemPrompt: STORY_SYSTEM_PROMPT,
    userMessage: buildStoryUserPrompt(req),
    maxTokens: 4096,
    responseFormat: 'json',
  }, { maxCostTier: req.costCeiling ?? 'cheap' });

  const story = JSON.parse(llmResult.text);
  const safePages = story.pages.map((p) => ({ ...p, text: filterOutput(p.text) }));

  const images = await Promise.all(
    safePages.map((p) => imageRouter.generate({
      prompt: p.imagePrompt,
      style: 'watercolor',
      width: 768,
      height: 768,
      seed: hashSeed(req.premise),
    }))
  );

  const pagesWithImages = safePages.map((p, i) => ({
    text: p.text,
    imageUrl: images[i].url,
    pageNumber: p.pageNumber,
  }));

  const creation = await saveCreation({
    type: 'story',
    title: story.title,
    prompt: req.premise,
    content: { pages: pagesWithImages, ...story },
    sessionId: req.sessionId,
    aiMetadata: { llm: llmResult.providerName, images: images.map((i) => i.providerName) },
    aiConceptsTaught: ['natural_language_generation', 'text_to_image'],
  });

  await trackCreation(req.sessionId, 'story');

  return {
    creationId: creation.id,
    title: story.title,
    pages: pagesWithImages,
    shareUrl: `https://gsi.ai/c/${creation.shareUrl}`,
    costUsd: llmResult.costUsd + images.reduce((s, i) => s + i.costUsd, 0),
    durationMs: Date.now() - start,
  };
}
```

The current `app/api/ai/story/route.ts` collapses to:

```ts
export async function POST(req: NextRequest) {
  const sessionId = req.headers.get('X-Session-Id');
  if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);
  const input = storyInputSchema.parse(await req.json());
  await checkRateLimit(sessionId);
  const result = await createStory({ ...input, sessionId });
  return apiSuccess(result);
}
```

**The route is now ~10 lines** of HTTP-specific plumbing. The 80 lines of orchestration moved to a reusable capability.

---

## 2. MCP Server Channel (3 days)

### What MCP gets you
- Claude Desktop users invoke your platform directly: "Create a 5-page story about Arjun discovering a time machine, age 8."
- Cursor / Continue / Cline / any MCP-compatible IDE
- ChatGPT Apps (when MCP rolls out widely)
- B2B integrations: schools wire their LMS to your MCP server, kids create from inside their school portal

### Architecture

```
lib/mcp/
  server.ts              ← entry point (stdio or HTTP transport)
  tools.ts               ← tool definitions (one per capability)
  resources.ts           ← read-only data (curriculum, user's creations)
  prompts.ts             ← reusable templates for parents/teachers
```

### Tool definitions

```ts
// lib/mcp/tools.ts

import { Server } from '@modelcontextprotocol/sdk/server';
import { z } from 'zod';
import { createStory } from '@/lib/capabilities/createStory';
import { createMusic } from '@/lib/capabilities/createMusic';
import { createComic } from '@/lib/capabilities/createComic';
// ... etc

export function registerTools(server: Server) {
  server.tool(
    'create_story',
    'Generate an illustrated story for a kid, age-appropriate, with safety filters.',
    z.object({
      premise: z.string().min(5).max(500),
      ageGroup: z.enum(['5-7', '8-10', '11-13', '14-17']),
      pages: z.number().int().min(3).max(8).default(5),
      language: z.enum(['en', 'hi', 'ta', 'te', 'kn']).default('en'),
      characters: z.array(z.string()).optional(),
    }),
    async (args, { sessionId }) => {
      const result = await createStory({ ...args, sessionId });
      return {
        content: [
          { type: 'text', text: `Created "${result.title}" — view: ${result.shareUrl}` },
          { type: 'resource', resource: { uri: `gsi://creation/${result.creationId}` } },
        ],
      };
    }
  );

  server.tool('create_music', /* ... */);
  server.tool('create_quiz', /* ... */);
  server.tool('create_comic', /* ... */);
  server.tool('create_game', /* ... */);

  // Teacher tools (Phase 4)
  server.tool('generate_lesson_plan', /* ... */);
  server.tool('generate_question_paper', /* ... */);
}
```

### Authentication

For HTTP transport, MCP uses OAuth. Map MCP sessions to your existing user accounts:
- Parent installs the MCP server in Claude Desktop with their phone-OTP token
- All creations attribute to that user (so they show up in their dashboard)

### Effort
- **Day 1**: extract first 3 capabilities (`createStory`, `createMusic`, `createQuiz`).
- **Day 2**: MCP server + 3 tools, stdio transport (works with Claude Desktop).
- **Day 3**: HTTP transport + OAuth, deploy to `mcp.gsi.ai`.

### Why do this even pre-launch
- Distribution: every Claude/Cursor/Cline user is a free acquisition channel.
- Validation: if the MCP server gets used, you've validated the capability layer cleanly. If it doesn't, you've lost 3 days.
- Foundation: voice + WhatsApp will reuse the same capability layer.

---

## 3. Voice-Only Channel — The Strategic Question

### Why this is interesting (for India specifically)

| Reality | Implication |
|---|---|
| Many 6–10 year olds in India can't type fluently in English | Voice removes the literacy barrier |
| Vernacular languages (Hindi, Tamil, Telugu, Kannada) dominate at home | Voice + Sarvam AI = native experience |
| Most kids share a parent's phone | WhatsApp voice messages > app installs |
| Parents trust WhatsApp; new apps face friction | Distribute via WhatsApp, no install |
| WhatsApp Business API exists with voice message support | Async voice → async delivery is feasible |

### Why this is risky

| Risk | Notes |
|---|---|
| Voice STT for kid speech in vernacular languages is harder than adults | Sarvam AI is the strongest option but not perfect |
| Kid attention span on async voice (record, wait, hear back) is unproven UX | Need pilot validation |
| Parent moderation when there's no UI is harder | Safety pipeline must be airtight |
| WhatsApp Business API costs (per-message + per-session pricing) | Per-conversation cost ~₹0.40, adds up |
| You're now competing for "voice agents" mindshare with ChatGPT voice mode | Differentiation must be the kid + curriculum angle |

### The architecture (if you go for it)

```
                                ┌──────────────────────┐
WhatsApp voice msg ────►        │                      │
Phone call (IVR)   ────►   ────►│  lib/channels/voice  │
Web mic            ────►        │                      │
                                └────────┬─────────────┘
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            │                            │                            │
      ┌─────▼─────┐              ┌───────▼────────┐         ┌─────────▼─────────┐
      │ STT       │              │ LLM Orchestrator│         │ TTS               │
      │ (Sarvam,  │              │ (Claude/Groq    │         │ (ElevenLabs,      │
      │  Whisper) │              │  with capability│         │  Sarvam Bulbul,   │
      │           │              │  tools)         │         │  Google TTS)      │
      └───────────┘              └───────┬────────┘         └───────────────────┘
                                         │
                                         │ calls
                                         ▼
                                ┌────────────────────┐
                                │ lib/capabilities/* │  ← same layer the web UI uses
                                └────────────────────┘
                                         │
                                         ▼
                                ┌────────────────────┐
                                │ Delivery channel:  │
                                │  WhatsApp media,   │
                                │  email, SMS link   │
                                └────────────────────┘
```

### The orchestrator is just an MCP client

The "LLM Orchestrator" box above is **literally an LLM with your MCP tools attached**. The kid says "make me a story about a robot in school," the LLM decides to call `create_story({premise: "..."})`, gets the result back, then calls a TTS tool to read the story aloud.

**This is why MCP-first matters.** Build MCP tools, then voice = LLM + STT + TTS + your MCP tools. Most of the heavy lifting is already done.

### Recommended provider stack for voice (India)

| Component | Provider | Why |
|---|---|---|
| STT (Indian languages) | **Sarvam AI Saarika** | Best-in-class for Indian-language ASR; Hindi/Tamil/Telugu/Kannada native |
| STT (English) | Whisper (Groq-hosted, free) → Deepgram (paid fallback) | Groq's whisper-large-v3 is free + fast |
| LLM (orchestrator) | Groq Llama 3.3 (free) → Claude Haiku (paid fallback) | Sub-second latency required for voice |
| TTS (Indian languages) | **Sarvam Bulbul** | Native Indian-language TTS, kid-appropriate voices |
| TTS (English) | ElevenLabs (cheap voice) or Google Cloud TTS | Standard quality |
| Voice transport | **WhatsApp Business API** (primary) → Vapi or LiveKit (web) | India distribution = WhatsApp |
| Async delivery | WhatsApp media message + share link → email backup | Whoever's phone, kid can listen |

### Effort

If MCP is already done:
- **Week 1**: WhatsApp Business API integration; voice message in → STT → LLM → tool call → TTS → voice message out.
- **Week 2**: Polish — turn-taking, error handling, multi-language detection, kid-voice prompt tuning.
- **Week 3**: Pilot — 20 families on WhatsApp.

Without MCP foundation: add another ~1 week for capability extraction.

### My recommendation on voice

**Don't build voice now. Validate the hypothesis with a fake door first.**

1. Add a "Voice mode (coming soon — join waitlist)" CTA on the landing page.
2. For waitlisted users, run a **manual** Wizard-of-Oz pilot: 5 parents send WhatsApp voice messages to a number you personally answer. You manually transcribe, run the existing web UI, send back the result. Do this for 2 weeks.
3. If parents come back with a 3rd request unprompted → real demand exists. Build it.
4. If they don't → the hypothesis is wrong, save 3 weeks.

This is the cheapest way to test whether voice is genuinely transformative for your target user, vs. just a cool engineering project.

---

## 4. WhatsApp Channel (Even Without Voice)

Whether or not you build full voice, **WhatsApp text-bot is a no-brainer for Indian distribution.**

```
Parent: "Story about Priya finding a magic mango tree"
Bot:    [generates] "Done! 5 pages. Listen here: gsi.ai/c/abc123 — share with Priya 🥭"
```

This is a thin channel adapter on top of `createStory`. ~3 days work using Twilio WhatsApp API or WhatsApp Business Cloud API.

The `botSessions` and `botLinkCodes` collections in `data-model.md` (lines 841 and 865) suggest some bot work has already started. Worth checking what's there.

---

## 5. Email-as-Delivery Channel

For async creation (especially voice + WhatsApp), email is a reliable fallback:
- Kid creates story via voice on WhatsApp
- Result delivered as: (a) WhatsApp media message + (b) email with PDF attachment to parent
- Parent can print, share, archive

Trivial to add — `lib/channels/email.ts` with one `deliverCreation(creationId, recipient)` function. Use Resend or AWS SES.

---

## 6. The Capability Catalog (Plan it Now)

To make all channels work, list every capability the platform offers. Future channels just pick from this list.

| Capability | Web | MCP | Voice | WhatsApp | Email |
|---|---|---|---|---|---|
| `createStory` | ✓ | ✓ (high pri) | ✓ | ✓ | (delivery only) |
| `createMusic` | ✓ | ✓ | ✓ | ✓ | (link delivery) |
| `createQuiz` | ✓ | ✓ | partial (audio Q&A) | ✓ | ✓ (PDF) |
| `createComic` | ✓ | ✓ | partial (text only) | ✓ | ✓ (PDF) |
| `createGame` | ✓ | ✓ | ✗ (interactive) | ✗ | ✗ |
| `playGame` | ✓ | ✗ | ✓ (text adventure mode) | partial | ✗ |
| `createLessonPlan` (teacher) | ✓ | ✓ (high pri) | ✗ | ✗ | ✓ |
| `generateQuestionPaper` (teacher) | ✓ | ✓ | ✗ | ✗ | ✓ |
| `getCreations` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `getKidProgress` (parent) | ✓ | ✓ | ✓ | ✓ | ✓ (weekly digest) |

This matrix becomes the spec for the capability layer.

---

## 7. Phased Plan

### Phase 0 — Prerequisites (already covered)
- Backend abstraction (`backend-abstraction-plan.md`) — 3–5 days
- AI provider abstraction (`ai-provider-abstraction-plan.md`) — 5 days

### Phase 1 — Capability layer extraction (3 days)
1. Create `lib/capabilities/`. Move orchestration out of `app/api/ai/*/route.ts`.
2. Each capability is a pure function with explicit input/output types.
3. Refactor existing API routes to be thin wrappers (~10 lines each).

### Phase 2 — MCP server (3 days)
1. `lib/mcp/server.ts` + tool definitions.
2. stdio transport for Claude Desktop.
3. Publish to npm as `@gsi/mcp-server`. Distribution channel unlocked.

### Phase 3 — WhatsApp text bot (3 days)
1. `lib/channels/whatsapp/` with WhatsApp Business API integration.
2. Reuses MCP tool definitions (LLM orchestrator pattern).
3. Pilot with 20 families.

### Phase 4 — Email delivery (1 day)
1. `lib/channels/email.ts` with Resend/SES.
2. Auto-delivery for: weekly parent digest, school reports, voice-mode results.

### Phase 5 — Voice (DEFER until demand validated)
1. Wizard-of-Oz pilot (manual) — 2 weeks, no engineering.
2. Only build real voice agent if WoZ pilot shows pull.

**Total committed work**: ~10 days for Phases 1–4. Voice is gated on validation.

---

## 8. Open Strategic Questions

1. **Is "voice-only, no UI" the same product as "web UI + voice channel"?**
   I'd argue same product, multiple channels — same user gets value from both depending on context (parent on commute uses voice; kid at home uses web). A truly UI-less product would be a different brand for a different segment (e.g. illiterate kids in tier-3/4 cities).

2. **Should MCP be free or gated by Pro plan?**
   Free MCP = best distribution. But free unlimited generations via MCP would blow free-tier economics. Solution: MCP enforces the same per-day rate limits as web (3 free, 50 Pro). Auth via existing user account.

3. **Schools — do they want an MCP server or an LMS integration?**
   Probably LMS. Same architecture; MCP server is just the easiest first integration. Schools wanting deeper integration get an HTTP API (which already exists).

4. **WhatsApp Business API costs scale per conversation (~₹0.40/conversation in India).**
   At 1K active families × 5 convs/week = ~₹80K/month. Need to model this in the cost plan if we go heavy on WhatsApp.

5. **Do we need a separate "agent" experience (long-running multi-turn assistant) vs. one-shot tool calls?**
   MCP = one-shot tools (good for "create a story now"). Agent = multi-turn ("help me make a 10-story series about Indian festivals over the next month"). Defer agent until clear demand.

---

## 9. What I'd Do This Week

1. **Days 1–3**: Phase 1 — capability extraction. Pure mechanical refactor; very low risk; unblocks every other channel.
2. **Days 4–6**: Phase 2 — MCP server with 3 tools (story, music, quiz). Publish to npm. Tweet about it. Free distribution.
3. **Day 7**: Set up Wizard-of-Oz voice pilot. Find 5 parents in your network. Give them a WhatsApp number.

This gets MCP into the world (distribution leverage) while validating the voice hypothesis without engineering risk.

---

## 10. Source References

- Existing API routes (to refactor into capabilities): `app/api/ai/{story,music,quiz,comic,game}/route.ts`
- Bot session collections (some WhatsApp work already started): `docs/data-model.md:841`, `docs/data-model.md:865`
- Existing safety pipeline (must be reused by every channel): `lib/safety/`
- Companion plans:
  - `docs/backend-abstraction-plan.md` — backend ports
  - `docs/ai-provider-abstraction-plan.md` — LLM/image/audio ports
  - `docs/infra-cost-and-migration-plan.md` — cost economics
