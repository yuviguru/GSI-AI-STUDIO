# BILLING-005: Refund flow — auto-reversal of credits on Razorpay refund

## Description

Today's behavior: the Razorpay webhook receives `refund.created` events
and logs them with a `(not yet auto-reversed — see BILLING-005)` note —
but the kid's credit balance is **not** automatically adjusted. Finance
has to reconcile by hand, which doesn't scale.

Build the auto-reversal flow:

1. **Trigger**: Razorpay webhook delivers `refund.created` (or
   `refund.processed`) for a payment we credited via `addTopupCredits`.
2. **Locate ledger entry**: query
   `kids/{kidId}/creditLedger.where('paymentRef', '==', payment_id)` to
   find the original `topup` entry.
3. **Compute reversal amount**: usually full refund == full topup credits.
   For partial refunds, reverse a proportional share rounded down.
4. **Write `refund` ledger entry**: amount = negative of credits to
   reverse, `paymentRef` = refund_id (NOT payment_id, so the original
   topup entry can still be deduped on `paymentRef`). Set `reversedBy`
   on the original topup entry. Atomic: same transaction as the kid-doc
   `creditBalance` / `creditBalanceTopup` debit.
5. **Clamp at zero**: if the kid has spent the credits down already
   (balance < refund amount), reverse only what's left and log the
   shortfall. Never let `creditBalance` go negative.

## API additions

- `POST /api/billing/razorpay/webhook` — extend the `refund.created`
  handler in `apps/kid/app/api/billing/razorpay/webhook/route.ts`.
  Currently it logs. Replace the log with a call to a new
  `reverseTopupCredits(paymentId, refundId, amount)` in `lib/billing/credits.ts`.
- `POST /api/billing/admin/reverse` — admin-only manual reversal for
  support (when ops issues a Razorpay refund out-of-band and webhooks
  haven't caught up).

## Data model

New ledger entry type (already documented in `docs/data-model.md`):
`refund`. Amount is negative. `paymentRef` is the Razorpay refund ID.
`reversedBy` on the original topup entry now points to the refund
entry's id.

## Out-of-scope for this story

- Subscription refunds (Razorpay refunds the latest payment of an
  active sub — needs to also call `cancelSubscription` + flip
  `planStatus`).
- Bonus credit reversal (admin gave a kid 100 credits, then realised
  it was the wrong kid — for now use a follow-up admin tool).

## Verification

- E2E: hit a real Razorpay test refund (Razorpay dashboard → Refund
  payment), observe webhook log + balance update.
- Unit: `lib/billing/credits.spec.ts` adds tests for `reverseTopupCredits`:
  full refund, partial refund, refund after credits already spent
  (clamp to 0).

## Deferred from

BILLING-001 Phase 3 — webhook had a stub for `refund.created`. The user
flagged that there's no admin UI yet to surface refunds, so this story
is paired with BILLING-006 (admin grant UI) which will house the manual
refund button.

## Dependencies

- BILLING-006 (admin UI) — useful but not required; the auto-reversal
  works without UI.
- Super-admin role gate — for the `/api/billing/admin/reverse` endpoint.
  Reuse the existing `auth.plan === 'admin' || auth.role === 'schoolAdmin'`
  pattern from `/api/billing/admin/grant`.
