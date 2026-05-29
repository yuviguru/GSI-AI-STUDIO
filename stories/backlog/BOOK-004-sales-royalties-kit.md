# BOOK-004: Book Sales + Royalties + KIT Split

> **Shipping in two phases.** Phase 1 (this story) lands the schema, types, config, and scaffold UI. **Phase 2 is deliberately a separate story** because real-money payment flows for content sold by minors in India is a multi-week compliance project (DPDPA, payment compliance to minors, refund/dispute handling, customer support, parent verification). Building it half-way is worse than not building it.

## Phase 1 scope (this story)

### What ships
- `Book.sales` field on Book doc (`enabled: boolean`, `priceInr: number | null`, `listedAt: Date | null`)
- New Firestore collections (empty for now, schemas ready for Phase 2):
  - `bookSales/{saleId}` — purchase records
  - `kids/{kidId}/royaltyLedger/{entryId}` — append-only ledger
  - `kitFund/global` (singleton) — lifetime KIT donations tracker
- New config doc `config/royaltySplit` — admin-tunable revenue split (creator/KIT/platform percentages) with defaults `60/20/20` as **placeholders** — user said "I want to decide later, build as configurable"
- API: `PATCH /api/books/[id]/sales-config` — author sets price + enabled flag (validates ownership; price bounds INR 10–999)
- API: `GET /api/shop/books` — browse listed books (basic — no search, no filters yet)
- API: `GET /api/billing/royalties` — read royalty balance + lifetime
- API: `GET /api/kit-fund` — public read of lifetime KIT total
- UI scaffold:
  - `/shop/books` page — grid of for-sale books with effort badges + price
  - `SalesConfigForm` in `PublishModal` — "Sell this book?" checkbox + price input + KIT message
  - `RoyaltyBalanceBadge` (small pill, mirrors CreditsBadge pattern)
- Firestore rules update
- Docs (data-model, api-contracts, ux-patterns, security)

### What's Phase 2 (deferred — separate stories)

| Deferred | Why deferred | Story name |
|---|---|---|
| Razorpay purchase flow (parent pays for child's book) | Needs parent verification UX, dispute handling, fraud rules | BOOK-004-P2-purchase-flow |
| Royalty distribution on successful purchase | Depends on purchase flow + KYC requirements for kid creators | BOOK-004-P2-royalty-distribution |
| Royalty cash-out to parent bank (in INR) | Heavy KYC + payment compliance (PA-DSS), parent identity verification | BOOK-004-P2-cashout |
| Refund flow with royalty reversal | Depends on purchase flow | BOOK-004-P2-refunds |
| Admin fulfillment + reconciliation tools | Depends on purchase flow | BOOK-004-P2-admin-ops |
| KIT donation receipts (parent-tax-deductible) | Requires registered charity partner | BOOK-004-P2-kit-receipts |
| Buyer-facing "library" of purchased books | Depends on purchase flow | BOOK-004-P2-buyer-library |
| Featured listing / sales analytics for creators | Future polish | BOOK-004-P2-creator-analytics |

### Honest user-visible state at end of Phase 1

- Kid can mark a book as "for sale" with a price — UI says **"Selling will open soon — you're setting the price for when it goes live"**
- Shop page lists for-sale books but the "Buy" button is **disabled with "Coming soon"**
- Royalty balance always shows ₹0 (no sales possible)
- KIT fund counter always shows ₹0
- No actual money moves anywhere

This is honest signaling — the kid sets things up, sees what the future looks like, but nothing real happens yet.

## Data model

### `Book.sales` (NEW)

| Field | Type | Required | Description |
|---|---|---|---|
| enabled | boolean | yes | Author opted in to selling |
| priceInr | number \| null | yes | Set when `enabled === true`. Bounds 10-999. |
| listedAt | timestamp \| null | yes | First time enabled was set true |

### `bookSales/{saleId}` (NEW — empty in Phase 1)

| Field | Type | Description |
|---|---|---|
| bookId | string | Reference to the book |
| kidId | string | Author (royalty recipient) |
| buyerSessionId | string | Buyer's session (anonymous-safe) |
| buyerUserId | string \| null | Buyer's parent user (Phase 2+) |
| priceInr | number | Amount paid |
| splitSnapshot | `{ creator, kit, platform }` | Frozen split % at sale time |
| status | `'pending' \| 'paid' \| 'refunded' \| 'failed'` | Lifecycle |
| razorpayOrderId | string \| null | Phase 2 |
| razorpayPaymentId | string \| null | Phase 2 |
| createdAt | timestamp | |
| paidAt | timestamp \| null | |

### `kids/{kidId}/royaltyLedger/{entryId}` (NEW — empty in Phase 1)

Mirrors `creditLedger` pattern.

| Field | Type | Description |
|---|---|---|
| type | `'earn' \| 'cashout' \| 'reverse'` | |
| amountInr | number | Positive on earn, negative on cashout |
| balanceAfter | number | |
| saleId | string \| null | Reference for earn entries |
| cashoutId | string \| null | Reference for cashout entries (Phase 2) |
| createdAt | timestamp | |

### `kitFund/global` (NEW — singleton, initialized at 0)

| Field | Type | Description |
|---|---|---|
| lifetimeInr | number | Total KIT contributions across all sales |
| updatedAt | timestamp | |

### `config/royaltySplit` (NEW)

```json
{
  "splits": {
    "creator": 60,
    "kit": 20,
    "platform": 20
  },
  "currency": "INR",
  "updatedAt": "...",
  "updatedBy": "..."
}
```

Defaults to 60/20/20 per the discussion. Admin can tweak from Firebase console. Sum must be 100.

### Kid doc additions

| Field | Type | Description |
|---|---|---|
| royaltyBalanceInr | number | Denormalized cache, default 0 |
| royaltyLifetimeInr | number | Never decreases; for analytics |

## API contracts

### `PATCH /api/books/[id]/sales-config`

**Request:**
```json
{ "enabled": true, "priceInr": 49 }
```

**Validation:**
- Owner-only (kidId or sessionId match)
- Book must be `status: 'published'`
- priceInr: number, integer, 10-999 inclusive, required when enabled
- Sets `listedAt` on first enable; leaves it stable on subsequent edits

### `GET /api/shop/books`

**Query:** `?limit=20&cursor=<docId>`

**Response:** array of `{ bookId, title, authorName, coverThumbnail, priceInr, effortBadge, listedAt }`

Filters: `status==='published'`, `isPublic===true`, `sales.enabled===true`. Sorted by `listedAt desc`.

### `GET /api/billing/royalties?kidId=...`

Returns `{ balanceInr, lifetimeInr, recentEntries: [...] }`. In Phase 1 always zeros.

### `GET /api/kit-fund`

Public. Returns `{ lifetimeInr }`. In Phase 1 always 0.

## UX

### Sell-this-book form (`SalesConfigForm`) — slotted into `PublishModal`

After the effort badge preview, add:

```
┌──────────────────────────────────────┐
│  Sell this book?                     │
│                                      │
│  [ ] Yes, sell on the GSI Bookshop   │
│                                      │
│  Price:  ₹ [ 49 ]                    │
│                                      │
│  Every sale splits like this:        │
│    ₹29 → you (royalties)             │
│    ₹10 → KIT (books for kids who     │
│           can't afford one)          │
│    ₹10 → platform (keeps GSI free)   │
│                                      │
│  ⚠️ Selling opens soon — you're     │
│     setting the price for when it    │
│     goes live.                       │
└──────────────────────────────────────┘
```

The split numbers update live based on `config/royaltySplit` and the entered price. Even though buying doesn't work in Phase 1, this teaches the kid (and the parent watching over their shoulder) the model.

### Shop page (`app/(public)/shop/books/page.tsx`)

Grid layout. Each card:
- Cover thumbnail
- Title + author
- Effort badge (small)
- Price chip
- "Coming soon" Buy button (disabled, gray)
- Tap card → open the public viewer

Header: "GSI Bookshop — every book here was written by a kid. Part of every sale supports KIT, helping kids who don't have books." + lifetime KIT counter.

### Royalty + KIT badges in nav

- `RoyaltyBalanceBadge` — small pill near CreditsBadge in MobileHub HUD. Shows ₹ amount, links to `/royalties` (BOOK-006).
- KIT counter only visible on shop page header (not in HUD — would be noise).

## Files

- New: `apps/kid/app/api/books/[id]/sales-config/route.ts`
- New: `apps/kid/app/api/shop/books/route.ts`
- New: `apps/kid/app/api/billing/royalties/route.ts`
- New: `apps/kid/app/api/kit-fund/route.ts`
- New: `apps/kid/app/(public)/shop/books/page.tsx`
- New: `apps/kid/app/(public)/shop/books/ShopBooksClient.tsx`
- New: `lib/billing/royalties.ts` — server lib (mostly Phase 2; Phase 1 has only the balance reader)
- New: `lib/config/royaltySplit.ts` — server resolver, mirrors `studioLaunchState` pattern
- New: `lib/config/royaltySplitDefaults.ts` — client-safe
- New: `hooks/useRoyaltySplit.ts`
- New: `hooks/useRoyaltyBalance.ts`
- New: `components/billing/RoyaltyBalanceBadge.tsx`
- New: `components/studios/book/SalesConfigForm.tsx`
- Extend: `packages/types/src/book.types.ts` — `Book.sales`
- Extend: `packages/types/src/user.types.ts` — kid doc royalty fields
- New: `packages/types/src/sales.types.ts` — `BookSale`, `RoyaltyLedgerEntry`, `KitFund`, `RoyaltySplit`
- Extend: `components/studios/book/PublishModal.tsx` — render SalesConfigForm
- Extend: `firestore.rules` — books.sales fields server-write, bookSales/* server-only, kitFund/global public read

## Acceptance criteria (Phase 1)

- [ ] Author can toggle "Sell this book" on a published book; price persists in Firestore
- [ ] Setting enabled writes `listedAt`; toggling off doesn't clear it
- [ ] Shop page lists all books with `sales.enabled === true && isPublic === true`
- [ ] Shop card shows price + effort badge + "Coming soon" disabled buy button
- [ ] PublishModal shows split breakdown matching `config/royaltySplit`
- [ ] Royalty + KIT API endpoints return 0 (no sales yet) without erroring
- [ ] Royalty pill in HUD renders ₹0 and links to /royalties
- [ ] All values configurable via Firestore — no hardcoded splits in render path
- [ ] `pnpm build`, `pnpm lint`, `pnpm test --run` green

## Honest gaps as of end of Phase 1 (will need follow-up stories)

1. **No actual buying** — "Coming soon" everywhere money would change hands
2. **No purchase confirmation flow / parent gate** — Phase 2
3. **No cash-out** — even if royalties existed, no way to pull them as INR
4. **No refunds, no disputes** — Phase 2 with purchase flow
5. **No buyer "my library"** — Phase 2
6. **No admin tools to inspect sales or KIT distributions** — Phase 2
7. **No KIT charity partner identified** — out of engineering scope, ops thread
8. **No DPDPA compliance documentation for child PII in sales context** — needs legal review before Phase 2
9. **No fraud detection** — Phase 2
10. **No tax / GST handling** — Phase 2 (need CA advice)

I'm writing this list directly so it doesn't get lost.
