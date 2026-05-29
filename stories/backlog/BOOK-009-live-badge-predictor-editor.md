# BOOK-009: Live effort-badge predictor in the editor

> **Parent**: BOOK-003 (effort badges).

## Why

PublishModal shows the badge prediction RIGHT BEFORE publishing — already
late in the loop. By then the kid has invested effort and is unlikely to
go back and rewrite more pages. We want the badge prediction visible WHILE
editing so it becomes a live progress meter.

## Scope

Add a small floating pill in the editor toolbar that shows:
- Current predicted badge (uses `computeEffortBadge(book.authorship)`)
- Tiny progress to the next better badge ("Rewrite ~30 more chars for Co-Author")
- Tap → opens a tooltip with the full breakdown

Updates live on every page save (debounced 1s). Driven by the same
`book.authorship` denormalized summary BOOK-003 already maintains.

### Out of scope
- Per-page badge prediction (book-level is enough)
- Animations on threshold crossing (cool but adds complexity)

## Files

- New: `components/studios/book/LiveBadgeIndicator.tsx`
- Extend: `components/studios/book/BookEditorClient.tsx` — mount in the
  editor chrome

## Acceptance criteria

- [ ] Pill renders the current predicted badge on first editor load
- [ ] Updates within ~1s of a page save (debounced; not on every keystroke)
- [ ] Shows distance to next-better badge in characters when meaningful
- [ ] Tooltip matches PublishModal breakdown shape
- [ ] Doesn't render on legacy books with no `book.authorship` field
- [ ] `pnpm build` + `pnpm lint` + `pnpm test --run` green

## Estimated effort

~4 hours. Reuses BOOK-003's `computeEffortBadge`, just adds the indicator.
