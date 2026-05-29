# BOOK-006: /royalties page — balance + KIT + "coming soon" redemption

> User said: "Redeeming the royalties, we can create a placeholder page and then just show some images and have 'coming soon' added."

Small, fast, honest. Lands the page so the future is visible without overcommitting.

## Scope

A new public route `/royalties` showing the kid:
- Their current royalty balance (always ₹0 in Phase 1)
- Lifetime royalties earned (always ₹0 in Phase 1)
- Total contributed to the **KIT Fund** by everyone (always ₹0 in Phase 1)
- 3 "Coming Soon" redemption cards: Cash to bank, Merchandise, Donate to KIT (extra)

Plus an "About KIT" explainer block: what KIT means, who it helps, why a percentage of every sale goes there.

### What we are NOT doing
- No actual redemption flow (cash-out, merch order, donate) — these are Phase 2 of BOOK-004
- No KIT charity partner integration — ops thread
- No tax receipts — Phase 2

## Files

- New: `apps/kid/app/(public)/royalties/page.tsx`
- New: `apps/kid/app/(public)/royalties/RoyaltiesClient.tsx`
- New: `components/billing/RoyaltyRedemptionCard.tsx` — single placeholder card
- New: `components/billing/KitExplainerBlock.tsx`
- Reuses: `useRoyaltyBalance` (from BOOK-004), `useKitFund` (new tiny hook)

## UX

```
┌────────────────────────────────────────────────────┐
│                                                    │
│   🪙 Your Royalties                                 │
│                                                    │
│   Balance:         ₹ 0                             │
│   Lifetime:        ₹ 0                             │
│                                                    │
│   ────────────────────────────────────────────     │
│                                                    │
│   What you can do with royalties:                  │
│                                                    │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│   │   💰     │  │   👕     │  │   ❤️     │         │
│   │ Cash to  │  │ GSI      │  │ Donate   │         │
│   │ parent's │  │ Merch    │  │ extra to │         │
│   │ bank     │  │          │  │ KIT      │         │
│   │          │  │          │  │          │         │
│   │ Coming   │  │ Coming   │  │ Coming   │         │
│   │  soon    │  │  soon    │  │  soon    │         │
│   └──────────┘  └──────────┘  └──────────┘         │
│                                                    │
│   ────────────────────────────────────────────     │
│                                                    │
│   💛  About KIT                                    │
│                                                    │
│   KIT (Kids In Tomorrow) is a fund that buys       │
│   books, learning materials, and AI Studio access  │
│   for kids who don't have them.                    │
│                                                    │
│   Every book sold on GSI sends 20% to KIT —        │
│   automatically, no extra step.                    │
│                                                    │
│   Total raised so far:  ₹ 0                        │
│                                                    │
└────────────────────────────────────────────────────┘
```

The "Coming soon" stamps are first-class — kid can see what's planned, why, and roughly when.

## Acceptance criteria

- [ ] `/royalties` route renders for any session
- [ ] Balance + lifetime show kid's actual values (Phase 1: always ₹0)
- [ ] KIT total shows the singleton tracker value (Phase 1: always ₹0)
- [ ] 3 redemption cards render with "Coming Soon" stamp; clicking them does nothing harmful
- [ ] About KIT block explains the program in plain language
- [ ] Linked from RoyaltyBalanceBadge (BOOK-004) — kid can navigate there from the HUD
- [ ] Mobile responsive
- [ ] `pnpm build`, `pnpm lint` green
