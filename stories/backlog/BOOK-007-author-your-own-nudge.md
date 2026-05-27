# BOOK-007: "Try writing your own page" nudge banner

> **Parent**: BOOK-002 (AI book generation entry). I called this out in the
> BOOK-002 story scope and the end-of-push review as the single biggest
> engagement gap — without it, kids generate an AI book then publish it
> as-is, never feeling the badge progression.

## Why it matters

Today, a kid taps "Generate with AI" → 5 pages drafted in 15-30s → lands in
editor → if they don't touch anything, they publish with the "AI Generated"
badge (≥85% AI). The badge system was designed so kids feel pride when
they rewrite, but there's no UI prompt to do so. Most kids will skip it.

This story adds a friendly, dismissible banner that appears AFTER the kid
has browsed 3 AI-generated pages without editing any. Strong enough to
motivate, gentle enough not to nag.

## Scope

- Track per-page visits in the editor (which pages has the kid scrolled past?)
- When kid has visited ≥ 3 pages from an AI-generated book without any
  edits, show a dismissible banner
- Banner copy: "✨ This book was drafted by AI. Try rewriting a page in
  your own words — your badge gets better the more you make it yours!"
- One-shot per book: dismiss persists in `localStorage[`gsi-nudge-dismissed-${bookId}`]`
- Auto-dismiss if the kid starts editing (positive reinforcement — they got the message)

### Out of scope
- Per-page nudges ("rewrite this page!") — too pushy for v1
- Reward for dismissing (no XP/coins for closing a banner)
- A/B test variant copy (premature optimization)

## Files

- New: `components/studios/book/AuthorYourOwnNudge.tsx`
- Extend: `components/studios/book/BookEditorClient.tsx` — track page visits,
  mount the nudge when conditions met

## Acceptance criteria

- [ ] Banner only appears for books where `book.authorship.initialSource === 'ai_generated'`
- [ ] Triggers after visiting ≥ 3 distinct pages without editing any
- [ ] Editing any page (paragraph save) auto-dismisses + sets the localStorage flag
- [ ] Tapping the X dismisses + sets the flag
- [ ] Dismissed state persists across sessions
- [ ] Doesn't appear for manual-flow books
- [ ] Unit test for the visit-counter + dismiss logic
- [ ] `pnpm build` + `pnpm lint` + `pnpm test --run` green

## Estimated effort

~3 hours. Small surface, depends on existing editor state.
