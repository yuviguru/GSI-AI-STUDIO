# AUTH-002: Fix Contentless "Account Full" Migration Dead-End

## Description

A signed-in parent with a full roster (4 kids) was hard-blocked on every
sign-in by the sign-in migration prompt showing **"Account full — guest work
can't be saved here"** with an empty body (no XP/badges/creations card). The
user had no real guest work and no graceful way out — only "sign out + new
phone number" or "discard."

## Root Cause

The prompt fires when two signals coincide (`useUserSessionStatus.ts`):
`user.claimedSessionSummary` exists **AND** localStorage `gsi-pending-claim` is
set. Three misaligned definitions of "meaningful" let a **contentless** claim
through:

1. **Claim-writer** (`claimAnonymousSession`, `userService.ts`) counted
   `Boolean(mergedOnboarding)` as meaningful — so an avatar/mascot-only guest
   session (no name, 0 points, 0 creations; e.g. from the login-only flow) got
   stashed as `claimedSessionData`.
2. **Gate** (`useUserSessionStatus`) entered `authenticated-migrating` whenever
   `claimedSessionSummary` existed at all — including contentless ones.
3. **Modal** (`SessionMigrationPrompt`) only renders its summary card for
   points/badges/creations/**name** (`hasAnything`) → an onboarding-only claim
   shows a blank prompt.

On a full account (4 kids) the gate routes to Branch C ("Account full") with no
"keep" path, and nothing clears `claimedSessionData`, so it re-fires on every
sign-in. (Not a fresh code regression — recent hardening stopped *new* empty
claims but didn't retroactively clear a pre-existing onboarding-only snapshot.)

## Data Safety (verified)

"Discard and continue" calls `archiveClaimedSession(uid, pendingSessionId)`,
scoped to that one anonymous session: soft-archives the session doc + creations
where `sessionId == pendingSessionId` (`status='archived'`, operator-reversible
within the retention window). It **never** queries the `books` collection and
never touches kid profiles. Kid books live under kid sessions / the `books`
collection, a different scope. So discarding cannot delete a user's books.

## Fix

- **Gate**: `claimedSummaryIsKeepable(summary)` (exported from
  `useUserSessionStatus.ts`) — keepable iff points/badges/creations or a
  **named** onboarding. The migrating phase requires it, so contentless claims
  never block routing.
- **Self-heal**: `AppGate` ((public)/layout.tsx) clears a lingering contentless
  claim for a signed-in user *with kids* via an empty-body
  `/api/users/discard-claimed-data` (drops the orphaned field only; archives no
  session/creations), then `refreshProfile`. One-shot via ref.
- **Claim-writer**: `hasMeaningfulData` now requires `mergedOnboarding?.name`
  (not avatar/mascot alone), aligning all three definitions so it can't recur.

## Requires KB Updates

- None (behavior fix; the claim/migration flow is documented inline + here).

## Subtasks

### [FE] Gate guards on keepable claims

**Target**: `hooks/useUserSessionStatus.ts`, `hooks/useUserSessionStatus.spec.ts`
**Action**: Update / Create
**Requirements**: export `claimedSummaryIsKeepable`; require it for
`authenticated-migrating`; regression tests for the contentless / avatar-only /
named / points / creations cases.

### [FE] AppGate self-heals stuck accounts

**Target**: `apps/kid/app/(public)/layout.tsx`
**Action**: Update
**Requirements**: one-shot effect — signed-in + hasKids + contentless claim →
empty-body discard + clear `gsi-pending-claim` + `refreshProfile`.

### [API] Claim-writer requires a name to stash onboarding

**Target**: `packages/firebase/src/userService.ts`
**Action**: Update
**Requirements**: `hasMeaningfulData` counts onboarding only when it has a name.

## Verification

- `pnpm typecheck` ✅ · `pnpm lint` ✅ (both apps) · `pnpm build` ✅ (both apps)
- `useUserSessionStatus.spec.ts` 7/7 ✅ (covers the exact avatar-only dead-end)
