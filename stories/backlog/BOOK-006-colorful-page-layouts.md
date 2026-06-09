# BOOK-006: Colorful, size-aware hybrid page layouts

> **Parent**: BOOK-001 (book studio foundation) + BOOK-002 (AI book generation).
> **Status**: Implemented on branch `claude/books-module-prompts-CjhTt` (commit
> `485ccf2`) — **this doc is the design spec for review**. Direction confirmed:
> *hybrid by scene-type*. Open to changes; implementation will be revised to match.

## Why

Today every book page renders as **a plain white page with an image in a box and
text underneath** — the single biggest "this looks AI-generated" tell. The
reference books the team loves (Pixar/Ghibli-style picture books, watercolour
number books, framed-illustration storybooks) share three things our renderer
lacks:

1. **Colour** — themed page backgrounds, not white.
2. **Composition variety** — full-bleed cinematic spreads for big moments,
   framed art-on-colour for quieter pages; never the same layout twice in a row.
3. **Craft details** — image mats/borders, drop-caps, accent page numbers.

This must hold across **all three surfaces** that paint a page — the editor
preview, the public flipbook viewer, and the downloaded PDF — and must respond
to the book's **trim size** (a landscape picture book and a pocket poem book
should not compose the same way).

## Design decisions

### 1. One render-agnostic source of truth

`lib/books/pageComposition.ts` is consumed by **both** `FlipbookPreview` (screen,
React) and `generateBookPdf` (print, jsPDF). Returns plain hex/number/boolean so
neither renderer pulls in the other's primitives. This guarantees the preview,
viewer, and PDF can't drift apart.

### 2. Palette from one theme colour — `derivePalette(themeColor)`

A book already has a single `themeColor`. We expand it (preserving hue, clamping
saturation/lightness to legible bands) into:

| Token | Use |
|---|---|
| `pageBg` | Tinted page background (never white) |
| `matBg` + `border` | Card/frame around a framed illustration |
| `accent` | Page-number pill, drop-cap, rules |
| `text` | Hue-tinted dark body text (readable) |
| `captionBg` | Scrim behind text on full-bleed pages |

Applies to **every** book (AI- and wizard-authored), so the whole product gets
the upgrade, not just new AI books. Falls back to brand purple when `themeColor`
is null.

### 3. Composition from layout + size — `resolveComposition(layout, size)`

Maps the existing `PageLayout` enum + the book trim to one of four modes:

| Mode | Triggered by | Treatment |
|---|---|---|
| `full_bleed` | `image_full_bleed`, `gallery` | Art edge-to-edge + floating caption card |
| `framed_image_top` | `image_top_text_bottom`, `concept_letter`, `recipe_split` | Mat+border art card on top, drop-cap text below |
| `framed_image_bottom` | `text_top_image_bottom` | Drop-cap text on top, framed art below |
| `text_feature` | `text_only`, `entry_centered` | Tinted page, centred for poems |

**Size-aware** `imageHeightRatio` (landscape 0.60 · square 0.56 · tall 0.50 ·
pocket 0.44) and `paddingRatio` (off the page's short side) so compact formats
keep text legible while landscape leans cinematic. No new enum values, **no
data-model change** — the colourful treatment derives entirely from existing
`layout` + `themeColor` + `size`.

### 4. Hybrid-by-scene-type at generation — `lib/books/sceneLayout.ts`

The BOOK-002 premium prompt tags each page with a `sceneType`. We map it to a
`PageLayout`:

- Cinematic scenes (`wide_establishing`, `environmental_wonder`,
  `dramatic_reveal`, `action`) → `image_full_bleed` (but framed on the tiny
  `pocket` trim so text stays legible).
- `character_closeup` → full-bleed on roomy trims, framed otherwise.
- Quieter scenes (`discovery`, `emotional_reaction`, fallback) → framed,
  **alternating** top/bottom by page index so neighbours never match.

`createGeneratedBook` validates each mapped layout against the book's `bucket`
and falls back to the bucket default if disallowed — so an odd mapping can never
produce an invalid page.

## Files

- New: `lib/books/pageComposition.ts` — palette + composition + colour maths + drop-cap split
- New: `lib/books/sceneLayout.ts` — `sceneType` → `PageLayout` mapping
- New: `lib/books/pageComposition.spec.ts` — 20 unit tests
- Edit: `components/studios/book/FlipbookPreview.tsx` — `PageView` rewritten to the palette + composition system
- Edit: `lib/export/pdfGenerator.ts` — body pages rewritten to the same system
- Edit: `apps/kid/app/api/ai/book-generate/route.ts` — capture `sceneType`, assign per-page layouts
- Edit: `packages/firebase/src/bookService.ts` — `createGeneratedBook` accepts + validates per-page layout
- Edit: `docs/ux-patterns.md` — "Page composition & colour system" section

## Acceptance criteria

- [x] Single shared module drives both screen + PDF
- [x] Themed (non-white) page backgrounds for all books
- [x] Four composition modes with size-aware image/padding ratios
- [x] `sceneType` → layout mapping, alternating framed pages, bucket-validated
- [x] Unit tests for palette/composition/scene-layout (40 total in the two specs)
- [x] `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` green
- [ ] **Visual sign-off** — render a real book in `pnpm dev` (Firebase + AI keys
      needed; not possible in the CI/web container) and eyeball spreads + PDF

## Open follow-ups (not in this pass)

- Cover + back-cover still use the older treatment — bring them into the palette.
- Decorative botanical/corner frame motifs (several refs have them) — would need
  art assets or SVG borders.
- Wizard "colour theme" picker so kids choose the palette explicitly.
- True drop-cap in the PDF (jsPDF has no float; screen has it, PDF currently
  themes text without the enlarged initial).

## Honest deferral note

Direction was chosen twice as *hybrid by scene-type*, and process preference came
back as *spec-first*. The implementation already landed under the earlier
"build end-to-end" instruction; this spec is therefore a **review artifact**, not
a pre-build plan. If the design here isn't right, the renderer changes are
isolated to the files above and can be revised or reverted cleanly.
