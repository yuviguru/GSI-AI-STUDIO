# BOOK-010: Shareable badge celebration moment

> **Parent**: BOOK-003 (effort badges).

## Why

When the kid publishes and earns a badge — especially Pure Imagination or
Co-Author — there's a quiet "badge appears in modal" moment. That's a HUGE
identity beat ("I am a published author with a Co-Author badge") that we're
under-celebrating. We have ConfettiCelebration + CelebrationModal infra from
CLA-14 already; this story plugs the badge moment into that flow.

## Scope

When a publish succeeds and writes a `book.effortBadge`:
1. Fire `ConfettiCelebration` with the badge's accent color
2. Show a `CelebrationModal` variant: "You earned [badge]! Here's the share
   image you can send your parents/friends."
3. Generate a square OG-style PNG (1080x1080) with cover thumbnail + title +
   badge + KIT contribution + GSI footer. Reuse the existing OG image
   pipeline.
4. Three CTAs: Download image · WhatsApp share · Copy link to viewer

### Out of scope
- Animated GIF share image — static PNG is enough for v1
- Auto-post to social (parental consent dance)

## Files

- New: `lib/share/badgeShareImage.ts` — Cloudinary/Vercel-OG style generator
- New: `apps/kid/app/api/og/book-badge/[bookId]/route.ts` — serves the image
- Extend: `components/learning/CelebrationModal.tsx` — add badge-publish variant
- Extend: `components/studios/book/PublishModal.tsx` — trigger celebration
  after successful publish

## Acceptance criteria

- [ ] Confetti + modal fire on publish (book-level only — drafts don't celebrate)
- [ ] Share image renders correctly for all 4 badge types
- [ ] WhatsApp share opens with prefilled message + image link
- [ ] Modal auto-dismisses after 6s or on user tap
- [ ] Only fires ONCE per book publish (not on subsequent edits)
- [ ] `pnpm build` + `pnpm lint` green; unit test for the share-image route

## Estimated effort

~1 day. Most of the work is the share image generator.
