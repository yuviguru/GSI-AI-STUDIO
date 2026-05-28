# BOOK-014: Credit refund-on-failure

> **Parent**: BOOK-002 (AI book generation), but the primitive built here is
> reusable across every paid AI route. The PR-71 Codex review surfaced
> this gap when a kid could be charged the full image budget upfront and
> still lose those credits if Firestore or a provider failed mid-flow.

## Why

Today, when `/api/ai/book-generate` (or any AI route) succeeds at the
billing step but fails downstream — LLM provider 401, malformed JSON,
Firestore write failure, partial image render — the credits stay debited
and the kid gets nothing for them. The user vocab here matters: kids and
parents don't have the engineering vocabulary to understand "your attempt
was billable but didn't produce a book." That's a trust killer.

After PR-71's preflight fix, the kid no longer loses credits on the
"can't afford the full job" path. But the platform-fault failure paths
(provider outage, our parsing bug, partial image render) still silently
keep credits without delivering value. This story fixes that.

## Policy (what to refund vs not)

| Failure type | Whose fault | Action |
|---|---|---|
| LLM provider down (timeout, 5xx, auth) | Platform/provider | **Full refund** |
| LLM returns malformed JSON we can't parse | Platform/provider | **Full refund** |
| Firestore write fails during persist | Platform | **Full refund** |
| Some images render, some fail | Provider/prompt | **Per-image refund** for failed ones; kid keeps the book |
| Kid hates the result, wants to redo | Kid taste | **No refund.** They got what they paid for |
| Network drop mid-request | Network/client | **Idempotency-key-aware refund** (see follow-up section) |
| Safety filter rejects input | Kid input | **No refund.** Kid got immediate feedback; charge is symbolic |

Rule of thumb: if the kid did nothing wrong AND we have nothing to show
for it, refund. Otherwise hold the line.

## Scope (Phase 1)

### Server primitives

- New: `lib/billing/refunds.ts` — `refundCredits({sessionId, amount, feature, reason, originalLedgerEntryId?})` that writes a positive `'reverse'` entry to `creditLedger` and updates the denormalized cache atomically (mirror `credits.ts` transaction pattern).
- Extend: `lib/api-utils.ts` — when an `AppException` is thrown after credits were debited, attach a `creditsRefunded` field to the JSON error response so the client knows.
- Extend: `lib/billing/index.ts` — re-export `refundCredits`.

### Route wiring

- Extend: `apps/kid/app/api/ai/book-generate/route.ts` — track `creditsCharged` array of `{feature, amount, ledgerEntryId}` debits as we go. On any catch path AFTER the LLM call returns successfully but before `createGeneratedBook` commits, refund the full image budget. On partial image failure (some images succeed but not all), refund the per-image cost for the failed ones AFTER persist.
- Same wiring for `/api/ai/story`, `/api/ai/page-image`, `/api/ai/grammar-check` — apply the same pattern in a follow-up commit if not in this story.

### Client UX

- Extend: `hooks/useBookGenerate.ts` (and `useCharacterPortrait`, etc.) — read `creditsRefunded` from error responses, surface in the toast: "Could not generate your book. Don't worry — we refunded 25 credits. Try again?"
- Extend: `contexts/BillingNotificationContext.tsx` — add a `'refund'` notification kind so the kid sees credits flow back visually.

### Tests

- Unit: `lib/billing/refunds.spec.ts` — round-trip charge → refund → balance restored.
- Integration: spec the book-generate route with mocked LLM throwing post-billing, verify refund landed and response carries `creditsRefunded`.

## Out of scope (separate follow-ups)

- **Insurance pool / surcharge model** — adds a tiny % to every successful generation funding a "failure refund kitty" so the variance is smoothed. Only worth doing at ≥10K MAU when the refund tax actually moves margin. Tracked: `BILLING-FUTURE-insurance-pool`.
- **Retry-with-no-charge as alternative to refund** — already partially implemented via `llmRouter` cross-provider fallback. A dedicated "retry once free" UI affordance on the client is a UX story, not a billing primitive.
- **Network idempotency keys** — proper idempotency requires client-generated keys + a Firestore record of every in-flight request. That's a `INFRA-idempotency` story. Until then, network drops mid-request will result in "phantom debits" the kid would have to escalate manually.
- **Admin reversal tool** — operator UI to refund a kid arbitrarily for support cases. Separate `ADMIN-credit-reversal` story.
- **Auditable refund analytics** — dashboard tracking refund rate per route, refund cost as % of revenue. Separate `ANALYTICS-billing-health`.

## Files

- New: `lib/billing/refunds.ts`
- New: `lib/billing/refunds.spec.ts`
- Extend: `lib/billing/index.ts`
- Extend: `lib/billing/credits.ts` — `RefundLedgerEntry` type if not already present
- Extend: `lib/api-utils.ts` — `handleApiError` carries `creditsRefunded`
- Extend: `apps/kid/app/api/ai/book-generate/route.ts`
- Extend: `hooks/useBookGenerate.ts`
- Extend: `contexts/BillingNotificationContext.tsx`
- Docs: `docs/api-contracts.md` — document the `creditsRefunded` field on error responses

## Acceptance criteria

- [ ] `refundCredits()` reverses a debit atomically and writes a `'reverse'` ledger entry referencing the original
- [ ] Killing the Anthropic key + retrying book-generate triggers a Groq fallback (router) AND if Groq also fails, the credits are refunded and the response carries `creditsRefunded: 35`
- [ ] Simulating one image failing (mock the cascade) → the kid keeps the book + sees 5 credits refunded for the failed page
- [ ] Simulating Firestore write failure post-render → full 35-credit refund + no orphan book doc
- [ ] Toast in the kid app shows "Refunded N credits" when a refund landed
- [ ] `pnpm build` + `pnpm lint` + `pnpm test --run` green; unit + integration tests for refund paths

## Risk / cost note

Refunding eats the real provider cost (Anthropic/Groq/image cascade
charged us per attempt). For the launch volume this is acceptable — net
trust gain beats marginal cost. Re-evaluate when refund-rate × volume
moves margin by ≥1% of revenue.

## Estimated effort

~1 day. Most of the work is the refund primitive + careful wiring of the
try/catch tracking in routes. Test coverage for failure paths takes its
own pass.
