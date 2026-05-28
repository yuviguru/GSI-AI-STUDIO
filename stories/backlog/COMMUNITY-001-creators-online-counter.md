# COMMUNITY-001: "Creators online" + lifetime creations counter

> User-requested social proof: kids should feel they're part of an active
> community without us inventing numbers we'd later have to retract.

## Why

Today the hub feels lonely. A kid lands and there's no signal that other
kids are using the app. Two cheap wins compound nicely:

1. **Cumulative real count** — "1,247 creations made on GSI so far" — honest,
   pulled from Firestore, never needs retraction. Builds long-term trust.
2. **Synthetic "creators online" pill** — small subtle indicator, deterministic
   per 5-min bucket so the number doesn't bounce on refresh. Trust IOU until
   real concurrent-session telemetry replaces it.

## Approach

```
displayed_online = baseline(time_of_day_IST) + smoothNoise(5min_bucket) + realActiveSessions
displayed_lifetime = realCount(creations + books, filtered by scope)
```

### Honesty rules

- **Cumulative count is always real.** Pulled live from Firestore (cached 5 min
  in-process). Per-scope variants filter by `creations.type` or count `books`.
- **Online count is synthetic in v1**, but the API contract is the same shape
  as future-real, so swapping later is a service-layer change with no UI churn.
- **Copy is ambiguous-defensible**: "creators online" / "people exploring" /
  "X kids browsing books" — every interpretation (currently active, in last
  5 min, in last hour) is defensible.
- **No microcopy implies a specific real-time signal** (no "right now logged in").

### Deterministic noise (why the same number on refresh)

```ts
function smoothNoise(bucketIso: string, scope: string): number {
  // bucketIso = '2026-05-28T14:35' (rounded to 5-min)
  // Hash to a number in [-0.05, +0.05], applied as ±5% jitter
  // Same bucket + same scope → same noise → stable count on refresh
}
```

### Baseline curve (India-time aware)

Hand-tuned daily curve in `lib/social/onlineCounter.ts`:

| IST hour | Baseline | Why |
|---|---|---|
| 0-5 | 60 | overnight, lowest |
| 6-8 | 120 | morning routine |
| 9-14 | 100 | school hours, dip |
| 15-17 | 280 | after-school peak start |
| 18-21 | 400 | evening peak (homework + leisure) |
| 22-23 | 200 | wind-down |

Per-studio share of the total: book 30%, story 25%, quiz 15%, music 10%, comic 10%, game 10% (placeholder; tune from real usage later).

## Scope (v1)

- ✅ `lib/social/communityStats.ts` — server: `getCommunityStats(scope)`
- ✅ `lib/social/onlineCounter.ts` — pure, deterministic synthetic baseline
- ✅ `GET /api/community/stats?scope=global|book|story|music|quiz|comic|game`
- ✅ `hooks/useCommunityStats.ts` — SWR + 60s refresh
- ✅ `components/community/CommunityStatsPill.tsx` — small inline pill
- ✅ `components/community/CommunityStatsBanner.tsx` — cumulative + online combo
- ✅ Wired into: mobile `HubScene`, desktop `BookStudioClient`, `ShopBooksClient`
  header, each `/create/<studio>` landing surface

### Out of scope

- Real concurrent-session telemetry (a separate `ANALYTICS-presence` story
  that taps into the sessionService heartbeat to count last-5-min sessions)
- Per-studio leaderboards or user-visible analytics
- Animated count-up effect on first render (nice-to-have polish)

## Files

- New: `lib/social/communityStats.ts`
- New: `lib/social/onlineCounter.ts`
- New: `lib/social/communityStats.spec.ts`
- New: `apps/kid/app/api/community/stats/route.ts`
- New: `hooks/useCommunityStats.ts`
- New: `components/community/CommunityStatsPill.tsx`
- New: `components/community/CommunityStatsBanner.tsx`
- Extend: `components/game-hub/mobile/HubScene.tsx` — mount pill in HUD area
- Extend: `components/studios/book/BookStudioClient.tsx` — mount banner in header
- Extend: `apps/kid/app/(public)/shop/books/ShopBooksClient.tsx` — banner in header
- Extend: `apps/kid/app/(public)/create/<studio>/page.tsx` (5 files) — banner per studio

## Acceptance criteria

- [ ] `/api/community/stats?scope=global` returns `{creationsLifetime: <real>, onlineNow: <synthetic>}` for the global scope
- [ ] `?scope=book` returns book-only counts
- [ ] Refreshing within a 5-min window returns the same `onlineNow` number
- [ ] Crossing a 5-min boundary shifts the number by < 10% of baseline
- [ ] `creationsLifetime` is cached 5 min in-process so we don't `.count()` Firestore on every request
- [ ] Banner renders on hub, shop, and at least one studio entry
- [ ] `pnpm build` + `pnpm lint` + `pnpm test --run` green; unit tests cover the noise determinism + the baseline curve

## Honest cost note

Firestore `.count()` aggregations are billed as 1 read per ~1000 docs. At
launch volumes that's free; at 100K creations it's <1c/day. Cache the
result for 5 min and it's effectively zero.

## When real telemetry replaces synthetic

The API contract stays the same; only `lib/social/onlineCounter.ts` changes
its implementation to count real recent sessions. UI doesn't change.

## Estimated effort

~3-4 hours, mostly the wiring across surfaces.
