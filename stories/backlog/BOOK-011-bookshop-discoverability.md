# BOOK-011: Bookshop discoverability — hub entry + featured

> **Parent**: BOOK-004 Phase 1 (sales scaffold).

## Why

I shipped `/shop/books` but there's no link to it from the hub. A kid has to
know the URL. Even for browsing (no purchase needed) the shop is a daily
destination — it's where you see what other kids made and get inspired.

## Scope

1. **Hub entry**: add a "GSI Bookshop" widget to the desktop dashboard right
   rail + a "Bookshop" tile on the mobile hub Learn group (alongside Explore).
2. **Featured book card** on the hub: shows the newest 1 for-sale book with
   cover + effort badge + author. Tap → opens the public viewer.
3. **Empty-shelf state**: when no books are for sale yet, show "Be the first
   author — publish your book and turn on sales" with a CTA to the studio.

### Out of scope
- Algorithmic recommendations (just "newest" for v1)
- Categories / filters / search (too early without volume)

## Files

- New: `components/dashboard/BookshopWidget.tsx` — desktop rail widget
- Extend: `components/game-hub/shared/GameModes.ts` — add `'bookshop'` mode
  in the Learn group (mobile)
- Extend: `components/dashboard/PopularStudiosRow.tsx` — wire bookshop link

## Acceptance criteria

- [ ] Hub has a clickable Bookshop entry point (desktop + mobile)
- [ ] Featured book card pulls from `/api/shop/books?limit=1`
- [ ] Empty state renders cleanly when no books are listed
- [ ] Tapping any of the entry points lands on `/shop/books`
- [ ] `pnpm build` + `pnpm lint` green

## Estimated effort

~3 hours. Mostly wiring existing components.
