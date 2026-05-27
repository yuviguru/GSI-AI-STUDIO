# BOOK-005: Real-book Online Viewer — page-flip polish

> User: "We have to have some good animations, like an online viewer where a book feels like a real book being read online."

## What I'm shipping in this story

A meaningful upgrade to `PublicBookViewer.tsx` (the `/view/book/[slug]` route) and `FlipbookPreview.tsx` (in-editor preview) using CSS-driven 2D page-flip animations + sound + fullscreen + swipe.

**Explicitly NOT in this story (deferred):**
- **Realistic 3D paper-curl page turn** (the WebGL/canvas "looks like real paper" effect, e.g. turn.js / StPageFlip). This is a 1-2 day project on its own — needs a library evaluation, a Canvas2D or WebGL implementation, and physics tuning. Tracked as `BOOK-005-FOLLOWUP-realistic-page-curl`.

This is an honest scope reduction. The CSS flip we're shipping reads as "online book", but a kid will not mistake it for a physical book in their hand. That's a separate level of polish we'll get to.

## What gets better

### Before
- `FlipbookPreview.tsx` exists, renders pages as a static stack/grid
- `PublicBookViewer.tsx` shows pages but without engaging transitions
- No sound, no fullscreen, no keyboard or swipe controls

### After
- **Page-flip CSS animation** — 600ms cubic-bezier, rotateY transform, the outgoing page rotates 180° on Y-axis with shadow under it
- **Page-flip sound** — soft paper-rustle effect; uses existing sound system; respects `isMuted()`
- **Fullscreen toggle** — uses Fullscreen API, button in viewer controls
- **Keyboard nav** — Left/Right arrows, Home/End for first/last page
- **Touch swipe** — on mobile, swipe left/right to flip pages (using framer-motion's `useDragGesture`)
- **Progress bar + page counter** — "Page 3 of 5"
- **Two-page spread** on desktop (≥1024px wide) — shows facing pages like a real open book
- **Subtle scene** around the book — cream background, soft shadow underneath
- **Cover hand-off** — book opens from closed cover (front cover → page 1 transition is special)

## Out of scope (clear deferral list)

| Feature | Reason | Follow-up |
|---|---|---|
| Realistic 3D paper-curl page turn | Needs canvas/WebGL library, physics tuning, perf testing | BOOK-005-FOLLOWUP-realistic-page-curl |
| Page-thumbnail strip / quick-jump | Polish; not core to "feels like a real book" | BOOK-005-FOLLOWUP-thumbnails |
| Zoom into image (pinch / tap) | Polish; complicates touch gesture handling | BOOK-005-FOLLOWUP-zoom |
| Read-aloud (TTS reads the book) | Separate accessibility story | A11Y-001-read-aloud-books |
| Page-turn analytics (which page lost the reader) | Telemetry; not user-facing | ANALYTICS-001-book-viewer-events |

## Files

- Extend: `app/(viewer)/view/book/[slug]/PublicBookViewer.tsx`
- Extend: `components/studios/book/FlipbookPreview.tsx`
- Extend: `lib/sounds.ts` — add `pageFlip` synth effect (joins existing buttonTap, success, etc.)
- New (small): `components/studios/book/BookViewerControls.tsx` — fullscreen + page counter + nav arrows in a unified toolbar

## Acceptance criteria

- [ ] Clicking next/prev triggers a 600ms 2D page-flip animation
- [ ] Page-flip sound plays unless muted
- [ ] Fullscreen toggle works on desktop (browsers that support it) and falls back gracefully on iOS Safari
- [ ] Left/Right arrows navigate; Home/End jump to first/last; Esc exits fullscreen
- [ ] Mobile swipe gestures flip pages
- [ ] Two-page spread shows on desktop ≥1024px
- [ ] Cover-to-page-1 transition feels distinct (book opening)
- [ ] No regression in `PublicBookViewer` — still respects `isPublic` gating, error states, missing-image fallbacks
- [ ] `pnpm build`, `pnpm lint`, `pnpm test --run` green

## Honest end-state

After this ships, the kid can flip through their book online with a satisfying animation and sound. A parent watching over their shoulder will think "nice, this feels like a real online book reader." But it does NOT yet feel like a physical paper book — that's the next iteration (realistic page-curl).
