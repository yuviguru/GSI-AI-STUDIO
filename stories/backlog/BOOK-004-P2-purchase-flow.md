# BOOK-004 Phase 2: Real-money purchase flow + royalty distribution

> **Parent**: BOOK-004 Phase 1 (sales scaffold). Phase 1 shipped the data
> model, configurable royalty split, sales-config form, and a `/shop/books`
> browse with disabled Buy buttons. This is the part that turns money on.

## Why this is its own story (not "just finish BOOK-004")

Real money flowing from one minor to another minor's family in India hits
multiple compliance surfaces that engineering can't shortcut:

1. **DPDPA**: child PII (buyer + seller) in a financial context
2. **Payment compliance to minors**: payouts to bank accounts of minors are
   restricted; royalty must flow to parent-verified bank accounts
3. **Razorpay KYC for payout recipients**: each creator needs parent-supplied
   bank details + a verified PAN
4. **GST / TDS implications** on platform-mediated transactions
5. **Dispute / chargeback handling**: who arbitrates between two kid families?
6. **Refund flow** with royalty reversal across the ledger
7. **Charity partner integration** for the KIT pool (a registered partner
   with 80G certification for tax-deductible donations)

This needs a multi-week engineering thread plus legal/CA advice. Building
half of it would be worse than not shipping any of it.

## Phase 2 scope (when picked up)

- Razorpay Order create on `POST /api/shop/books/[id]/checkout`
- Razorpay Webhook → ledger writes (creator royalty + KIT pool + platform)
- Parent verification gate before checkout (DPDPA-compliant flow)
- Cash-out: parent submits bank details + PAN; admin reviews; payout via
  Razorpay Payouts API
- Refund webhook → reverse ledger entries
- Admin fulfillment dashboard
- KIT charity partner integration + receipt generation
- Buyer "My Library" of purchased books
- DPDPA / RBI / GST documentation

## Pre-requisites (before this story can start)

- [ ] Razorpay business account upgraded to support Payouts API
- [ ] Legal review of the kid-creator → parent-payout flow
- [ ] CA confirmation of GST / TDS handling for kid-creator earnings
- [ ] KIT charity partner identified + onboarded
- [ ] Customer support runbook drafted for disputes

## Estimated effort

3-5 weeks engineering + parallel legal/ops thread. Not a single sprint.
