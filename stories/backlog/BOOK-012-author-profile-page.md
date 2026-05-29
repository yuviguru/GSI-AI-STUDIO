# BOOK-012: Author profile page `/author/[handle]`

> **Parent**: BOOK-001 (book studio foundation) + BOOK-004 (sales).

## Why

Once a kid publishes 2+ books, "I'm an author with a body of work" becomes a
real identity hook. We don't surface that today — books are listed per-book.
A `/author/[handle]` page gives every kid a portfolio.

## Scope

- New public route `/author/[handle]` rendering:
  - Author name + avatar + total books published
  - Effort-badge distribution (e.g. "3 Pure Imagination, 2 Co-Author")
  - Lifetime KIT contribution if they have sales
  - Grid of their published books
- Handle is derived from `book.author` field (slugified). Phase 2 (auth-aware)
  lets the kid claim a custom handle.
- "View author" link on every public viewer + shop card
- Open-graph image generator for shareable author profile

### Out of scope
- Following / subscribing to an author
- Comments / reactions on the profile
- Private profile mode (Phase 2)

## Files

- New: `apps/kid/app/(public)/author/[handle]/page.tsx`
- New: `apps/kid/app/(public)/author/[handle]/AuthorClient.tsx`
- New: `apps/kid/app/api/authors/[handle]/route.ts` — GET books by author
- New: `packages/firebase/src/bookService.ts` — add `listBooksByAuthor` query
  (needs a new composite index on `author + isPublic + publishedAt desc`)
- Extend: viewer + shop card → "by [author]" becomes a link

## Acceptance criteria

- [ ] Profile renders for any author with ≥1 published public book
- [ ] Effort-badge distribution accurate
- [ ] Books grid matches their public catalog
- [ ] 404 for unknown handles
- [ ] Composite index added to `firestore.indexes.json`
- [ ] OG image generator works for share links
- [ ] `pnpm build` + `pnpm lint` green

## Honest deferral note

This is a big surface area. Recommend splitting into two passes:
- Phase 1: read-only profile rendering from existing data
- Phase 2: handle claiming + auth-aware editing

## Estimated effort

~1.5 days (Phase 1 only).
