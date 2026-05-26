# BILLING-006: Admin tooling — manual credit grant + ledger inspector

## Description

`POST /api/billing/admin/grant` exists and works (curl + tests pass), but
there's no UI. Support cases that need it today:

1. Kid hit a bug, lost a generation → restore the credits.
2. Beta tester or hackathon prize → gift credits.
3. Razorpay refund issued out-of-band → reverse credits (paired with
   BILLING-005).
4. Investigate "where did my credits go?" reports — read the kid's
   ledger.

Right now ops has to:
- Look up the kidId via Firestore console
- Construct a curl with Firebase auth
- Cross-fingers — no preview, no audit trail

## Scope

Build a minimal **super-admin** surface gated behind `auth.plan === 'admin'`:

### Pages

- `/admin/billing/kids` — search kids by email or kid-id. Click → kid detail.
- `/admin/billing/kids/[kidId]` — read-only view:
    - Balance + grant/topup split
    - Plan + subscription state
    - Full ledger (paginated, reuses `LedgerSection`)
    - Three action buttons: **Grant credits** (BILLING-001 existing
      endpoint), **Reverse topup** (BILLING-005), **Force monthly grant**
      (calls `grantMonthlyCredits` to refresh now).

### Auth

- Existing `verifyAuth` + a new `requireAdmin(auth)` helper that
  throws 403 unless `plan === 'admin'`. (Distinct from `schoolAdmin`
  which is school-scope.)
- Add a layout guard that 404s the `/admin/*` routes for non-admins so
  they can't even see the URL.

### Audit

- Every action writes to a `billingAdminActions/{id}` collection:
  `{actorId, actorEmail, action, kidId, amount?, note, timestamp}`.
- The kid-detail page shows recent admin actions inline so the next
  admin viewing the same kid sees what was already done.

## Out of scope

- Bulk actions (gift 100 credits to every kid in school X) — separate
  follow-up if needed.
- Self-service kid actions (kid can see own ledger — already on
  `/billing/credits`).
- Razorpay invoice access (the dashboard handles this; we just need
  to surface ledger).

## Deferred from

BILLING-001 Phase 3 — endpoint shipped without UI. The user explicitly
noted no super-admin page exists yet, so this is its first task.

## Dependencies

- BILLING-005 (refund flow) — to wire the "Reverse topup" button.
- A "super-admin" role decision — is `plan: 'admin'` the only signal,
  or do we add a separate `role: 'superAdmin'`? Current schema uses
  `role: 'parent' | 'teacher' | 'schoolAdmin'`. We could extend or
  rely on `plan: 'admin'` (which is technically a plan, not a role).
  Probably the cleanest is to add `role: 'superAdmin'` and gate on it;
  decide before building.
