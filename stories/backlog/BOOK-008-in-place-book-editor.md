# BOOK-008: In-Place Book Editor — "edit the book like you read it"

## Description

The book *rendering* (BOOK-006 `pageComposition` + BOOK-007 safe-zones) is good.
The **editor is too complex for kids**: `PageEditor` has a rich-text toolbar
(bold/italic/headings/lists/align) + voice + grammar + a right-panel with
Picture/Grammar tabs + character chips + a separate image-prompt box, and you
must open a *separate* Preview modal to see the real book. You edit in
input-boxes/panels in one view, then switch views to see the book.

Replace it with an in-place editor: the rendered spread IS the editor. Benchmark
= Bribooks (user also calls it "DreamBooks"); mockup approved at
`mockup-book-editor.html`. See memory `project_book_editor_redesign.md`.

## Design Decisions

- **One screen.** Tap the words → inline editor ON the page (talk-first mic =
  voice dictation / "recitation", + type, + colour/size/font, NO alignment).
  Tap the picture → redraw (character-aware via `useSceneImage` when there's a
  cast, else `usePageImage`). Cast strip on top keeps characters consistent.
  Add/delete pages from the nav.
- **Mascot OUTSIDE the book.** `PixieFloatingBubble` is editor chrome anchored to
  the screen (fixed bottom-left), never painted on the spread — so it can't land
  in the preview or the printed/exported book.
- **Reuse, don't fork.** Geometry/colour from `pageComposition` (`derivePalette`);
  voice from `useVoiceInput`; images from `usePageImage`/`useSceneImage`; cast
  from `useBookCharacters` + `CastEditor` (surfaced as a bottom sheet); pages
  from `useBookPages`.
- **Retire** from the kid flow: the rich-text toolbar, the Picture/Grammar
  right-panel tabs, the standalone character-chip + prompt box, and the separate
  Preview modal coupling. (`PageEditor`/`PageNavigator` no longer used by
  `BookEditorClient`; kept on disk for now.)

## Subtasks

### [FE] EditableBook component — DONE (increment 1)
**Target**: `components/studios/book/EditableBook.tsx` (new),
`apps/kid/app/(public)/create/book/BookEditorClient.tsx` (swap in)
- In-place spread + tap-to-edit text (talk/type + colour/size/font) + tap-to-redraw
- Cast strip + cast sheet, add/delete page, dot nav, Pixie outside
- Verified: typecheck ✅, lint ✅ (both apps), build ✅ (exit 0)

### [FE] Reconcile reader/export to the editor look — DONE (increment 2)
**Decision: full-bleed everywhere** (user pick). `resolveComposition` now
collapses image-bearing layouts to `full_bleed` and keeps text-only as
`text_feature`; `FlipbookPreview` + `generateBookPdf` both render the full-bleed
overlay and now **honour `page.style`** (colour/size/font), so editor == reader
== PDF. Framed modes kept in the type for back-compat but no longer produced.
Verified: typecheck ✅, lint ✅, build ✅, pageComposition.spec 23/23 ✅.

### [API] Full-spread (wide) image dims — PARTIAL (#5 from review)
**Target**: `packages/ai/src/imageDims.ts`, scene/page-image prompts
- `imageDims` already generates at the book's full aspect, so full-bleed pages
  fill the page edge-to-edge (satisfies "image fills the page"). BOOK-007's
  OVERLAY_SAFE_ZONE_HINT now applies to every image page (all full_bleed).
- STILL TODO: a *true* single image bridging two facing PRINT pages (left half
  on page N, right half on N+1) needs a spread-as-unit model — trim + PDF-split
  + page-count/billing implications. Flagged as its own step.

## Notes
- Scratch mockup files (`mockup-book-editor.html`, `mockup/`, `.claude/launch.json`
  "book-mockup") are throwaway — remove before merge.
