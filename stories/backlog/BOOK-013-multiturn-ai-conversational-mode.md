# BOOK-013: Multi-turn AI conversational generate mode

> **Parent**: BOOK-002 (AI book generation entry).

## Why

I shipped a single-form AI generate ("topic, age, style, pages" → book) for
v1 because it's faster to ship. But the user asked for a "conversational
agent". A multi-turn mode where the AI asks specific questions ("What's the
dragon's name? Where does it live? What's its biggest fear?") feels like
co-creation, not vending-machine generation. Kids will be more invested in
the result.

## Scope

Add a THIRD option on the BookCreationModeChooser: "Co-create with AI"
between Manual and Generate-with-AI. Flow:

1. AI asks 4-6 questions one at a time (chat UI)
2. Each kid answer is logged + used to refine the next question
3. When the AI has enough, it summarises the spec and asks "Ready to draft?"
4. Generates the book using the conversation context (much richer prompt than the single-form)

The result book has `book.authorship.initialSource === 'ai_generated'` like
BOOK-002 — the same badge math applies. But kids who used this flow tend to
have stronger investment, so empirically expect higher kid-edit rates.

### Out of scope
- Voice-input mode (Web Speech API integration) — separate accessibility story
- Multi-turn after generation ("change this page") — a separate edit-assist story

## Files

- New: `components/studios/book/AiCoCreateChat.tsx`
- New: `apps/kid/app/api/ai/book-cocreate/route.ts` — turn-by-turn endpoint
- New: `packages/ai/src/prompts/bookCoCreatePrompt.ts` — the system prompt
  that drives the question-asking
- Extend: `components/studios/book/BookCreationModeChooser.tsx` — 3rd option

## Acceptance criteria

- [ ] Chat UI shows AI questions one at a time, kid answers in a text input
- [ ] AI maintains state across turns (session-scoped Firestore doc)
- [ ] "Ready to draft?" button generates the book with all gathered context
- [ ] Session cleaned up after generation completes
- [ ] Falls back gracefully if the kid abandons mid-conversation
- [ ] `pnpm build` + `pnpm lint` + `pnpm test --run` green

## Estimated effort

~2 days. Multi-turn state + chat UI is the most work.
