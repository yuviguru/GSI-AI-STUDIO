# BILLING-002: AI Royalties — Three-Currency Model with Real-World Redemption

> **Naming locked-in (2026-05-27):** the prestige currency is **AI Royalties**.
> Code field: `royaltyBalance`. UI label: "AI Royalties" (or "Royalties" when
> the context already implies the brand). Matches the AI prefix on the other
> two currencies (AI Coins, AI Points) and conveys "earned real-world value".

## Description

Add a **third currency** on top of the BILLING-001 foundation. The platform will have three distinct currencies, each serving a different psychological and economic role:

| | **AI Coins** (currency) | **AI Points** (progress) | **AI Royalties** (prestige) |
|---|---|---|---|
| Code field | `creditBalance` (BILLING-001) | `aiPoints` (existing) | `royaltyBalance` (NEW) |
| How earned | Bought + monthly plan grant | Activity: every creation, game, lesson | Rare milestones only |
| How spent | AI generation (assertEntitled) | **Never spent** — lifetime score | Redeemed for real-world rewards |
| Resets | Grants expire monthly; topups don't | Never | Never |
| Tradable / convertible | No | No | No |
| What it tells the kid | "How much can I create?" | "How far have I come?" | "What rare thing did I unlock?" |
| Visible to parent | Yes (purchases + usage) | Yes (badges, streaks) | Yes (redemption history) |

**Hard rule: no conversion between currencies.** Cross-currency exchange devalues all three. A kid who can grind XP into AI Coins will dodge paying for credits; a kid who can buy prestige rewards with AI Coins loses the "rare achievement" feeling. Each currency stays in its lane.

## Naming history (for context)

We considered Royalties / Gold / Treasure / Crowns. **Royalties** won because it's the only option that frames the kid as a paid creator and teaches a real-world earnings concept while feeling rare. Prefixed with "AI" to match the other two currencies.

### Earning triggers — keep them genuinely rare

Target volume: a normal-engaged kid earns ~5-15 units/month, a power user ~30-50. Heavy quantity drift is a signal to tighten criteria.

| Trigger | Sample amount |
|---|---|
| Creation featured by admin or algorithm | 5 |
| Book actually published (not draft) | 3 |
| 10-day creation streak | 2 |
| 30-day creation streak | 5 |
| Beat-the-AI streak win (5 in a row) | 2 |
| Complete a full CBSE curriculum module | 3 |
| Top 3 in monthly leaderboard | 10 / 5 / 3 |
| 100 total creations (lifetime milestone) | 5 |
| First-time community remix of your work | 3 |

Numbers are placeholders — calibrate post-launch with telemetry.

### Redemption catalog — digital first, physical follows

Real-world fulfillment has real ops cost: vendor relationships, parent-verified addresses (DPDPA implications for kid PII), customs handling, SLAs. **Phase 1 ships digital-only.** Physical comes after a fulfillment partner is in place.

**Phase 1 (digital — automated)**:

| Reward | Cost |
|---|---|
| Featured creation slot in `/explore` for 7 days | 5 |
| Premium mascot variant (rare avatar styles) | 8 |
| Custom AI X-Ray theme (cosmetic UI personalization) | 10 |
| Spotlight in next monthly newsletter | 8 |
| Donation to a school book charity in their name | 15 |
| Personalized PDF certificate signed by founder | 12 |

**Phase 2 (physical — needs vendor partner)**:

| Reward | Cost |
|---|---|
| One hardcover-print of their published book per year | 50 |
| Sticker pack (mascots, AI-themed) | 30 |
| GSI T-shirt | 75 |

## Architecture

Sits alongside `lib/billing/credits.ts` since it's the same conceptual layer (a currency ledger). Module structure:

```
lib/billing/
  prestige.ts       NEW — earn/redeem/balance, atomic ledger writes (mirror credits.ts)
  prestigeRewards.ts NEW — catalog config (digital Phase 1; physical Phase 2 gated)
  earnHooks/        NEW — triggers that call `earnPrestige()`:
    streak.ts        called from sessionService.streak when 10/30-day landmarks hit
    book.ts          called from bookService.publishBook
    featured.ts      called from admin "feature this creation" tool
    leaderboard.ts   called from monthly leaderboard cron
  ...existing BILLING-001 files unchanged...
```

### Schema additions

**Kid doc** (`kids/{kidId}`):
- `prestigeBalance: number` — denormalized cache, default 0
- `prestigeLifetimeEarned: number` — never decreases; for analytics on rarity
- `prestigeLastEarnedAt?: Date` — telemetry

**New subcollection**: `kids/{kidId}/prestigeLedger/{entryId}`
- `type: 'earn' | 'redeem' | 'reverse'`
- `amount: number` (positive on earn/reverse, negative on redeem)
- `balanceAfter: number`
- `triggerType?: string` (on earn — e.g. `streak_10`, `book_published`, `featured_creation`)
- `triggerRef?: string` (on earn — e.g. the bookId, creationId)
- `rewardId?: string` (on redeem — references prestigeRewards catalog)
- `redemptionId?: string` (on redeem — references the top-level redemption doc)
- `createdAt: Date`

**New top-level collection**: `prestigeRedemptions/{id}` (parent + admin can read; admin updates)
- `kidId: string`
- `rewardId: string`
- `rewardSnapshot: { displayName, costPrestige, fulfillmentType: 'digital' | 'physical' }`
- `status: 'pending' | 'fulfilled' | 'canceled' | 'failed'`
- `requestedAt: Date`
- `fulfilledAt?: Date`
- `parentApprovalRequired: boolean` (true for physical rewards)
- `parentApprovedAt?: Date`
- `shippingAddressRef?: string` (for physical — encrypted, parent-supplied, never the kid's)
- `notes?: string` (admin/parent-visible)

### Service surface

```ts
// lib/billing/prestige.ts
export async function earnPrestige(input: {
  kidId: string;
  amount: number;
  triggerType: string;
  triggerRef?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ balanceAfter: number; entryId: string }>;

export async function redeemPrestige(input: {
  kidId: string;
  rewardId: string;
  parentApprovalRequired?: boolean;
}): Promise<{ redemptionId: string; balanceAfter: number }>;

export async function reversePrestige(input: {
  kidId: string;
  redemptionId: string;
  reason: string;
  actorId: string;
}): Promise<{ balanceAfter: number }>;

export async function getPrestigeBalance(kidId: string): Promise<number>;
export async function getPrestigeLedger(kidId: string, limit?: number): Promise<PrestigeLedgerEntry[]>;
```

All writes atomic via Firestore transaction (mirror `credits.ts` pattern). Earn is idempotent on `(kidId, triggerType, triggerRef)` — a kid hitting the same 10-day streak after a glitch retry doesn't get double prestige.

### API contracts (additive to BILLING-001 — see `docs/api-contracts.md`)

- `GET /api/billing/prestige?kidId=` — balance + recent ledger
- `GET /api/billing/prestige/rewards` — catalog (filtered by what the kid can afford)
- `POST /api/billing/prestige/redeem` — `{kidId, rewardId}` → returns redemptionId
- `POST /api/admin/prestige/grant` — admin-issued (for support, beta tester gifts) — writes earn entry with `triggerType: 'admin_grant'`
- `POST /api/admin/prestige/fulfill` — admin marks `prestigeRedemptions/{id}` as fulfilled

## Phase 1 Scope (when this story is picked up)

**Foundation only** — defer reward catalog UI and physical fulfillment:

- ✅ Types: `PrestigeLedgerEntry`, `PrestigeRedemption` in `@gsi/types`
- ✅ Schema: kid doc fields + new subcollection + new top-level collection in `docs/data-model.md`
- ✅ Service: `lib/billing/prestige.ts` with full ledger ops + tests
- ✅ Earn hooks for 2-3 triggers (10-day streak, book publish, admin grant)
- ✅ `GET /api/billing/prestige?kidId=` — balance read endpoint (for showing in UI later)
- ❌ Reward catalog (defer — parents/admins need to align on the offering first)
- ❌ Redeem endpoint (depends on catalog)
- ❌ Parent-facing redemption UI (depends on the above)
- ❌ Admin fulfillment tool (depends on the above)

**Estimated**: ~12-15 files, ~600 LOC, parallel-mergeable with BILLING-001 Phase 2 (AI route wiring) and Phase 3 (Razorpay).

## Phase 2 Scope (follow-up story)

- Reward catalog config + types + tests
- Redeem endpoint + admin fulfillment endpoint
- `/sparks` (or `/royalties` etc.) page in kid app showing balance, history, catalog, Redeem CTA
- Parent dashboard "Recent achievements" section showing prestige-earning moments
- Physical-reward partner integration (out of scope for the engineering story — vendor selection is a separate ops thread)

## Open Questions

1. **Final name** — defaulted to placeholder `prestige*` in code. Pick before merging Phase 1.
2. **Earn-trigger volumes** — placeholders in the table above; calibrate from creation rate analytics before launch.
3. **Catalog governance** — who can add a reward? Engineering, ops, or a config file in the repo?
4. **Refunds / cancellations** — what's the policy if a kid redeems a featured slot then the parent disputes it?
5. **Physical partner** — print partner for books, merchandise vendor. Out of scope for engineering; flag this for ops.
6. **DPDPA compliance for physical** — kid addresses are off-limits; parent-supplied shipping needs encrypted storage + explicit consent. Reference `docs/security.md#data-protection`.

## Source

This story was drafted live during the BILLING-001 session when the user introduced the three-currency model. The full architectural discussion is preserved here so a future implementor (or future session) can pick it up with full context — no need to re-litigate the design.

Currency role separation, anti-conversion rule, naming shortlist, earning framework, and digital-first redemption model are all from that conversation. Earning amounts and reward costs are illustrative placeholders, not committed numbers.
