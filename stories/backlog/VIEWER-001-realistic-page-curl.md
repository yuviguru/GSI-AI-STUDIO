# VIEWER-001: Realistic 3D page-curl in book viewer

> **Parent**: BOOK-005 (viewer polish).

## Why

BOOK-005 shipped a satisfying CSS-based 2D flip with sound + fullscreen +
swipe. Good enough for "this is an online book". The user explicitly wanted
"feels like a real book being read online" — that's the realistic page-curl
(paper bending, shadow under the curling page, the edge you can almost grab).

## Approach

Two candidate libraries:
- **StPageFlip** (https://github.com/Nodlik/StPageFlip) — Canvas2D + WebGL, well-maintained, supports two-page mode out of the box
- **turn.js** — older, jQuery-dependent, would need a React wrapper

Recommendation: **StPageFlip**. Modern, framework-agnostic, has TypeScript types.

Wrap it in a React component that takes the same `book + pages` props as
`FlipbookPreview` but renders via StPageFlip. Behind a feature flag in
`config/studios.book` so we can A/B against the current CSS flip.

### Out of scope
- Pinch-zoom on page (separate VIEWER-002)
- Custom paper textures / cover materials
- VR / AR book viewer

## Files

- New: `components/studios/book/RealisticFlipbook.tsx` — StPageFlip wrapper
- Extend: `lib/config/studioLaunchState.ts` schema — add a per-feature flag
  `book.realisticViewer: boolean`
- Extend: `app/(viewer)/view/book/[slug]/PublicBookViewer.tsx` — switch
  component based on the flag

## Acceptance criteria

- [ ] Realistic page curl on next/prev (paper bends, shadow renders)
- [ ] Works on touch + mouse (drag-grab the corner)
- [ ] Page sound still fires (existing infra)
- [ ] Performance: 60fps on a mid-tier mobile for a 20-page book
- [ ] Feature flag controls which viewer renders (existing kid flow unchanged
      until flipped)
- [ ] `pnpm build` + `pnpm lint` green

## Honest cost note

StPageFlip adds ~80KB gzipped to the viewer bundle. Acceptable for the
`/view/book` route (already lazy-loaded), but worth measuring before merging.

## Estimated effort

~1 day, mostly testing on real devices.
