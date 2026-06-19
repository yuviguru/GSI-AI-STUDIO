# BOOK-007: Bribooks Layout Polish — Overlay Safe-Zones + Honest Picker

## Description

A small, focused follow-up to the shared composition engine (BOOK-006 / #73),
applying the remaining lessons from the Bribooks competitor benchmark (see memory
`project_bribooks_benchmark.md`) that BOOK-006 didn't cover. BOOK-006 already
delivered the big wins — one shared engine (`pageComposition.ts`), theme palette,
framed consistency, drop-caps, size-aware ratios, and no caption truncation — so
this story is intentionally a thin delta on top of it, not a re-implementation.

## Design Decisions

- **Build on `pageComposition.ts`, do not fork it.** All new logic keys off
  BOOK-006's `resolveComposition(layout, size).mode` so screen + print stay the
  single source of truth.
- **Overlay safe-zone composition**: covers and `full_bleed` pages lay text over
  the art, so the image generators ask the model to keep a calm lower band and
  put subjects up top (`OVERLAY_SAFE_ZONE_HINT`). This is the safe-zone
  composition that makes pro picture-book covers legible under their title —
  Bribooks' standout strength. Gated by `imageCarriesOverlay(mode)` so framed +
  text-feature pages (text on a separate themed area) are untouched.
- **Honest picker**: stop offering `gallery` ("Picture grid"). A real grid needs
  multiple images per page; a `BookPage` stores one `imageUrl`. The enum value
  stays (data compatibility) — legacy pages render as `full_bleed`.
- **Did NOT touch `recipe_split`.** BOOK-006 deliberately renders it as
  `framed_image_top` (stacked). The picker still labels it "Side by side" — a
  separate honesty question deferred to the user (relabel vs build a true
  side-by-side mode) rather than overriding BOOK-006's design unilaterally.

## Requires KB Updates

- ✅ `docs/ux-patterns.md` — "Overlay safe-zone (BOOK-007)" + "No fake grids" notes
  under the BOOK-006 composition section

## Subtasks

### [LIB] Overlay safe-zone helper

**Target**: `lib/books/pageComposition.ts`, `lib/books/pageComposition.spec.ts`
**Action**: Update
**Requirements**:
- `imageCarriesOverlay(mode)` → true only for `full_bleed`
- `OVERLAY_SAFE_ZONE_HINT` prompt suffix
- Tests for `imageCarriesOverlay`

### [API] Reserve a calm band when generating overlay images

**Target**: `apps/kid/app/api/ai/scene-image/route.ts`, `apps/kid/app/api/ai/page-image/route.ts`
**Action**: Update
**Requirements**:
- Reserve text band for covers (no pageId) and `full_bleed` pages (via `resolveComposition`)
- Append `OVERLAY_SAFE_ZONE_HINT` to the generated prompt in those cases

### [LIB] Retire the fake grid

**Target**: `lib/templates/bookTemplates.ts`
**Action**: Update
**Requirements**:
- Remove `gallery` from `BUCKET_LAYOUTS.visual` and sketchbook `defaultLayouts`

## Verification

- `pnpm typecheck` ✅ · `pnpm lint` ✅ (both apps) · `pnpm build` ✅ (both apps, after
  clearing a stale `.next` left by the branch reset)
- `pageComposition.spec.ts` 25/25 ✅

## Open question (deferred to user)

`recipe_split` is labelled "Side by side" in the picker but renders stacked
(BOOK-006). Options: (a) relabel to match the stacked render, (b) build a true
side-by-side composition mode, (c) leave as-is. Plus optional: replace the
picker's abstract layout glyphs with previews that mirror the real composition.
