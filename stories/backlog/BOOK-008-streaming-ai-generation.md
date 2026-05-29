# BOOK-008: Streaming AI book-generate progress

> **Parent**: BOOK-002 (AI book generation entry).

## Problem

Today the AI form blocks for 15-30s with a thinking mascot. That's eternity
for a kid — telemetry from other studios shows attention falls off a cliff
past ~10s of unbroken wait. We lose generations to "I'll try later" before
the book even drafts.

## Approach

Server: refactor `/api/ai/book-generate` to stream progress events:
- `{ phase: 'drafting' }` (Claude is writing)
- `{ phase: 'drafted', pageCount: N }`
- `{ phase: 'image', pageNumber: i, status: 'done' | 'failed' }` per image
- `{ phase: 'persisting' }`
- `{ phase: 'done', bookId }`

Use Server-Sent Events (`text/event-stream`) — simpler than WebSocket for
unidirectional progress. The client (`useBookGenerate`) consumes events and
the AiGenerateBookForm shows real progress:

```
✨ Drafting your book… ✓
🖼️ Drawing page 1 of 5… ✓
🖼️ Drawing page 2 of 5… ✓
🖼️ Drawing page 3 of 5… (in progress)
...
```

## Out of scope
- Cancellable mid-generation (kid hits Stop) — adds aborter wiring
- Resumable on disconnect — kid retries from scratch is fine for v1

## Files

- Refactor: `apps/kid/app/api/ai/book-generate/route.ts` — switch to SSE
- Refactor: `hooks/useBookGenerate.ts` — `EventSource` consumer
- Refactor: `components/studios/book/AiGenerateBookForm.tsx` — progress UI

## Acceptance criteria

- [ ] SSE events emit in order as text drafts → images render → book persists
- [ ] Client shows live progress with checkmarks
- [ ] Final event includes `bookId` for redirect (or `error` for failure)
- [ ] Existing non-streaming consumers (none yet, but for safety) get a 405 or
      a fallback path
- [ ] Total elapsed time on success matches or beats current blocking version
- [ ] `pnpm build` + `pnpm lint` + `pnpm test --run` green

## Estimated effort

~1 day. SSE is straightforward; the UI polish is most of the work.
