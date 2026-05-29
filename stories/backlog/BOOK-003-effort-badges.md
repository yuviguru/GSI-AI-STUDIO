# BOOK-003: Effort-based AI% Badges

> The user's frame: "We have to find a way, a beautiful way, to identify how much effort is put into this book based on that we give this badge. If a kit wants to get perfection, then we give him a fully human-generated badge."

## Scope

At publish time, compute the AI-vs-kid ratio for a book and award **one** effort badge. The badge appears on the book everywhere it's shown — public viewer, library card, shop listing (future BOOK-004), share image.

Badges (ordered most-kid → most-AI):

| Badge | Threshold | Color | Vibe |
|---|---|---|---|
| 🧠 Pure Imagination | aiPct < 10% | emerald | "All you. Wow." |
| 🤝 Co-Author | 10% ≤ aiPct < 50% | violet | "Real teamwork." |
| ✨ AI Sidekick | 50% ≤ aiPct < 85% | amber | "AI lent a hand." |
| 🤖 AI Generated | aiPct ≥ 85% | sky | "AI did the draft." |

(Names and emojis tuned for honesty + positivity — no badge feels bad to earn. "AI Generated" reads as a fact, not a put-down.)

### Future badges (separate stories, NOT in this one)

- 🏆 Bestseller — top sales in a window
- ⭐ Editor's Pick — admin-curated
- 🔥 Most Remixed — community remix count

User said these "come later, based on sales as well as what we put in." Not blocking this story.

## How the AI% is computed

```
aiPercentage = (textPct * textWeight + imagePct * imageWeight)
where:
  textPct  = aiCharTotal / max(aiCharTotal + kidCharTotal, 1)
  imagePct = aiImagePageCount / max(aiImagePageCount + kidImagePageCount, 1)
  textWeight  = 0.7  (text effort weighs more — that's the kid's voice)
  imageWeight = 0.3
```

Edge cases:
- Wordless picture books (no text) → text weight collapses to 0; only image ratio counts
- Image-only books → same
- Brand-new book with no pages → no badge until publish-time

Computed server-side in `lib/books/effortBadge.ts` from the book's denormalized `authorship` field (added in BOOK-002). Single arithmetic pass — no per-page reads needed.

## Schema additions

### `Book.effortBadge` (NEW)

| Field | Type | Required | Description |
|---|---|---|---|
| key | `'pure_imagination' \| 'co_author' \| 'ai_sidekick' \| 'ai_generated'` | yes | The awarded badge |
| aiPercentage | number | yes | 0-100, rounded to 1 decimal |
| awardedAt | timestamp | yes | When publish computed it |
| breakdown | `{ aiCharTotal, kidCharTotal, aiImagePageCount, kidImagePageCount }` | yes | Frozen snapshot for transparency |

The breakdown is shown to the kid in a "How was this earned?" tooltip — keeps the system feeling honest, not magical.

## API

### `POST /api/books/[id]/publish` — extend existing

Already exists. Add:
1. Read `book.authorship` summary
2. Call `computeEffortBadge(authorship)` → returns `{key, aiPercentage, breakdown}`
3. Write `book.effortBadge` field along with `status: 'published'` and `publishedAt`

No new endpoint needed.

### `GET /api/books/[id]` — extended response

Already returns the full Book doc. With `effortBadge` added to the doc, no API change needed.

## UX

### Badge component (`components/studios/book/EffortBadge.tsx`)

Renders the badge pill. Variants:
- `sm` (12px text, for library cards)
- `md` (14px, for share images and editor pre-publish preview)
- `lg` (18px, for the published viewer hero)

```tsx
<EffortBadge badge={book.effortBadge} showTooltip />
```

Hover/tap → tooltip with the breakdown ("82% AI — based on 240 AI words, 50 your words, 5 AI images, 0 your images").

### Publish-time preview (`PublishModal.tsx` — extend)

Before kid hits "Publish", show a live preview:

```
┌──────────────────────────────────────┐
│  Ready to publish?                   │
│                                      │
│  You'll earn this badge:             │
│    [ 🤝 Co-Author ]                  │
│                                      │
│  Based on:                           │
│    Words: 60% AI, 40% you            │
│    Images: 4 AI, 1 yours             │
│                                      │
│  Want a higher badge? Cancel and     │
│  rewrite a few more pages in your    │
│  own words.                          │
│                                      │
│        [ Cancel ]    [ Publish ]     │
└──────────────────────────────────────┘
```

This is the engagement loop — the kid sees the badge BEFORE committing, gets a fair chance to bump it. Strong motivator to actually rewrite AI pages instead of publishing as-is.

### Display surfaces

- Public viewer (`PublicBookViewer.tsx`) — `lg` badge in the title block
- Library card (`BookCard.tsx`, `BookTile.tsx`) — `sm` badge in the corner
- Share OG image (future) — included in image generation

## Files

- New: `lib/books/effortBadge.ts` — computeEffortBadge + thresholds + EFFORT_BADGES catalog
- New: `lib/books/effortBadge.spec.ts` — edge cases (all-kid, all-AI, no-text, no-images)
- New: `components/studios/book/EffortBadge.tsx` — visual component
- Extend: `packages/types/src/book.types.ts` — `Book.effortBadge`
- Extend: `packages/firebase/src/bookService.ts` — publishBook also writes effortBadge
- Extend: `components/studios/book/PublishModal.tsx` — pre-publish preview
- Extend: `app/(viewer)/view/book/[slug]/PublicBookViewer.tsx` — render badge
- Extend: `components/studios/shared/BookTile.tsx` — render `sm` badge

## Acceptance criteria

- [ ] All four threshold buckets compute correctly with edge cases (verified via unit tests)
- [ ] Publishing a book writes `effortBadge` to Firestore
- [ ] PublishModal shows the badge preview before publish, with breakdown
- [ ] Public viewer displays the badge prominently
- [ ] Library cards show the small-variant badge
- [ ] Tooltip shows the breakdown for transparency
- [ ] `pnpm build`, `pnpm lint`, `pnpm test --run` all green
