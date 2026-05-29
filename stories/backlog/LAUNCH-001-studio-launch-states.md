# LAUNCH-001: Studio launch states — LIVE / BETA / COMING_SOON

> **Why this story exists:** as we move from "everything is in active prototype" to
> "Book Studio is the first publicly-marketed live feature," every studio card
> needs to honestly signal its maturity to kids and parents. Book = LIVE. Story,
> Music, Quiz, Comic, Game = BETA (still reachable, but rough). Future studios
> can be added in a `COMING_SOON` state for marketing tease.
>
> **Why not a deploy-time constant:** the user wants to flip launch states from
> the Firebase console without a code deploy — e.g. promote Story Studio to LIVE
> the day we're confident, demote a studio if a bug surfaces. A Firestore config
> doc gives that lever; in-code defaults provide a safe fallback.

## Scope

Single-currency story: feature-state metadata only. No actual functional gating
of routes — every studio stays reachable. Only the visible badge/pill on studio
cards changes. The user explicitly said "make others beta, not hidden."

### In scope
- A `config/studios` Firestore doc with `{ studios: { <id>: { launchState } } }`
- Server library: `lib/config/studioLaunchState.ts` mirroring the `creditCosts`
  pattern (defaults → Firestore override → resolved map)
- Client-safe defaults: `lib/config/studioLaunchStateDefaults.ts`
- `GET /api/config/studios` public endpoint, 60s cache, public read
- `hooks/useStudioLaunchState.ts` — SWR fetch with instant default fallback
- `components/studios/shared/StudioLaunchPill.tsx` — small pill component:
  LIVE (emerald) / BETA (amber) / COMING SOON (gray) / null
- Wire pill into the **5 studio rendering surfaces** found in audit:
  1. `components/game-hub/shared/GameModes.ts` — populate `badge` per mode
     from launch state at render time (or pre-compute at module load)
  2. `components/dashboard/StudioSelectorPanel.tsx`
  3. `components/dashboard/StudioCardsColumn.tsx`
  4. `components/dashboard/PopularStudiosRow.tsx`
  5. `components/dashboard/FeaturedStudioCard.tsx`
- Type: `StudioLaunchState`, `StudioId`, `StudioLaunchConfig` in `@gsi/types`
- Unit tests for `studioLaunchState.ts` (defaults, Firestore-overrides-default,
  unknown-id fallback)

### Out of scope (follow-up stories)
- **Admin UI to flip flags** — `LAUNCH-002`. For now, ops sets the doc in Firebase
  console directly. Acceptable since the audience is one person (founder).
- **Functional gating** — no studio gets disabled. BETA is purely informational.
- **Telemetry** — no events fired on launch-state changes; add when admin UI ships.
- **Marketing site copy changes** — landing page hero, pricing, etc. don't change
  here. The CTA on `/welcome` keeps pointing to all studios.
- **Play / Learn group modes** — Kid CEO, MindX, Beat the AI, AI Lab, Explore are
  not part of the launch-state config. They keep their existing `badge` field
  values in `GameModes.ts`.

## Data model

### Firestore: `config/studios` (single document, top-level collection `config`)

```json
{
  "studios": {
    "book":  { "launchState": "live",  "label": "Book Studio",  "updatedAt": "2026-05-27T00:00:00Z" },
    "story": { "launchState": "beta",  "label": "Story Studio", "updatedAt": "2026-05-27T00:00:00Z" },
    "music": { "launchState": "beta",  "label": "Music Lab",    "updatedAt": "2026-05-27T00:00:00Z" },
    "quiz":  { "launchState": "beta",  "label": "Quiz Maker",   "updatedAt": "2026-05-27T00:00:00Z" },
    "comic": { "launchState": "beta",  "label": "Comic Studio", "updatedAt": "2026-05-27T00:00:00Z" },
    "game":  { "launchState": "beta",  "label": "Game Studio",  "updatedAt": "2026-05-27T00:00:00Z" }
  },
  "updatedAt": "2026-05-27T00:00:00Z",
  "updatedBy": "yuvaguru.guru8@gmail.com"
}
```

- `launchState` is one of `'live' | 'beta' | 'coming-soon'`
- `label` is informational only — the in-code defaults supply display labels
- If the doc is missing or the field is absent, the in-code defaults win
- No Firestore index needed (single-document lookup)
- Composite-index audit: N/A — single `.doc()` get

### Firestore rules

- Public read (it's display config — same risk profile as `creditCosts`)
- Server-only write (Admin SDK)

```firestore
match /config/{configId} {
  allow read: if true;
  allow write: if false; // server-only via Admin SDK
}
```

(The `config` collection didn't exist before; add the matcher to `firestore.rules`.)

## API contracts

### `GET /api/config/studios`

Returns the resolved launch-state map (defaults merged with any Firestore override).

**Request**: no body, no auth required.

**Response 200**:
```json
{
  "success": true,
  "data": {
    "studios": {
      "book":  { "launchState": "live",  "label": "Book Studio" },
      "story": { "launchState": "beta",  "label": "Story Studio" },
      "music": { "launchState": "beta",  "label": "Music Lab" },
      "quiz":  { "launchState": "beta",  "label": "Quiz Maker" },
      "comic": { "launchState": "beta",  "label": "Comic Studio" },
      "game":  { "launchState": "beta",  "label": "Game Studio" }
    }
  },
  "error": null
}
```

Cache header: `Cache-Control: public, max-age=60, stale-while-revalidate=300`
(matches `/api/billing/costs`). 60s window means ops flipping a flag sees
propagation within a minute.

## Architecture

### Module layout

```
lib/config/
  studioLaunchState.ts          - server: defaults + Firestore fetch + merge
  studioLaunchStateDefaults.ts  - client-safe defaults (no firebase-admin)

hooks/
  useStudioLaunchState.ts       - SWR-backed, falls back to client defaults

components/studios/shared/
  StudioLaunchPill.tsx          - the visual pill

packages/types/src/
  studio.types.ts               - StudioId, StudioLaunchState, StudioLaunchConfig
```

### Defaults — single source of truth

Both the server file and the client defaults file export the same map. To keep
them in sync, edit BOTH together. Same tradeoff as `creditCosts` / `creditCostsDefaults`
(see comment in `creditCostsDefaults.ts` line 1-16).

```ts
// Both files export:
export const STUDIO_LAUNCH_STATE_DEFAULTS: Readonly<
  Record<StudioId, { launchState: StudioLaunchState; label: string }>
> = {
  book:  { launchState: 'live',  label: 'Book Studio' },
  story: { launchState: 'beta',  label: 'Story Studio' },
  music: { launchState: 'beta',  label: 'Music Lab' },
  quiz:  { launchState: 'beta',  label: 'Quiz Maker' },
  comic: { launchState: 'beta',  label: 'Comic Studio' },
  game:  { launchState: 'beta',  label: 'Game Studio' },
};
```

### Pill component contract

```tsx
<StudioLaunchPill studioId="story" size="sm" />
// → renders <span class="...amber...">BETA</span> for story
// → renders null for book (LIVE is the default visual; no pill needed)
// → renders <span class="...gray...">COMING SOON</span> for future studios

<StudioLaunchPill studioId="story" size="sm" showLive />
// → renders <span class="...emerald...">LIVE</span> for book (opt-in)
```

Default behaviour hides the LIVE pill (no visual noise when a studio is live —
that's the baseline state). `showLive` lets surfaces that want a positive
"LIVE" affordance (e.g. the marketing-flavoured `FeaturedStudioCard`) opt in.

### Mobile hub `GameModes.ts` integration

`GameModes.ts` already has `badge: 'NEW' | 'LIVE'` + `badgeBg`. Two options:

**Option A (chosen)**: Drop the hardcoded `badge` field for the 6 creation studios.
Instead, the mobile hub's `PortalCard` will accept a `launchState` prop and render
the BETA/LIVE pill in the same visual slot via `StudioLaunchPill` component.

**Option B (rejected)**: Keep hardcoded `badge` and call a helper at module load to
overwrite with launch state. Rejected because module-load resolution can't access
Firestore (client-side SWR), so the badge would flicker on first paint.

`PortalCard` change: replace inline badge JSX with `<StudioLaunchPill studioId={mode.key as StudioId} size="xs" />`. The pill's "render null for LIVE" rule means the existing NEW badge on Book disappears — Book becomes the baseline (no pill). Play-group / Learn-group modes (ceo, mindx, beat-ai, ai-lab, explore) keep their existing hardcoded `badge` since they aren't in the launch-state config.

## UX patterns

- **BETA pill**: amber background (`bg-amber-100 text-amber-700`), uppercase
  tracking-wide font, 8px-10px text size depending on size prop, rounded-full
- **LIVE pill (opt-in)**: emerald background (`bg-emerald-100 text-emerald-700`)
- **COMING SOON pill**: neutral gray (`bg-gray-100 text-gray-500`)
- Position: typically absolute top-right or inline next to title — caller decides
- Size variants: `xs` (7px text, used in PortalCard), `sm` (10px), `md` (12px)

Add a section to `docs/ux-patterns.md` documenting this so future studios use
the pill instead of hand-rolling per-card "NEW" labels.

## Implementation order

1. ✅ KB updates: data-model.md, api-contracts.md, ux-patterns.md, security.md
   (rules update). Commit separately.
2. ✅ Types: `packages/types/src/studio.types.ts` + re-export from `index.ts`
3. ✅ Defaults: both `lib/config/studioLaunchStateDefaults.ts` and the same
   in the server file
4. ✅ Service: `lib/config/studioLaunchState.ts` with `getStudioLaunchStates()`
   (Firestore read, merged with defaults)
5. ✅ API: `apps/kid/app/api/config/studios/route.ts`
6. ✅ Hook: `hooks/useStudioLaunchState.ts`
7. ✅ Component: `components/studios/shared/StudioLaunchPill.tsx`
8. ✅ Firestore rules: allow read on `/config/*`, deny client write
9. ✅ Wire into 5 surfaces:
   - `PortalCard.tsx` — drop hardcoded badge for create-group; render pill
   - `GameModes.ts` — remove `badge: 'NEW'` from book (now LIVE-baseline)
   - `StudioSelectorPanel.tsx` — replace `isNew: true` with launch-state pill
   - `StudioCardsColumn.tsx` — add pill next to title
   - `PopularStudiosRow.tsx` — add pill next to title
   - `FeaturedStudioCard.tsx` — add pill (with `showLive`) next to rank badge
10. ✅ Unit tests: defaults, merge logic, unknown-id fallback
11. ✅ Verify: `pnpm lint && pnpm typecheck && pnpm test -- --run && pnpm build`
12. ✅ Open PR

## Acceptance criteria

- [ ] On `/` (mobile hub), Book Studio tile shows no pill; Story/Music/Quiz/Comic/Game tiles show BETA pill
- [ ] On `/` (desktop hub), same applies to whichever studio cards render
- [ ] On `StudioSelectorPanel` (wherever it mounts), Books shows no pill; the rest show BETA
- [ ] Setting `config/studios.studios.story.launchState = 'live'` in Firebase
      console flips Story Studio's pill from BETA → no pill within 60s of next page load
- [ ] If the `config/studios` doc is deleted, defaults still apply and Book stays LIVE
- [ ] No functional regression — every studio remains clickable and reachable
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test -- --run`, `pnpm build` all green

## Source of decisions

- Naming: "launch state" — chosen over "feature flag" because this isn't a
  binary on/off toggle and we want it to read as user-facing readiness signal
- Three states (LIVE / BETA / COMING_SOON) — minimum needed to cover today's
  needs and the redemption-page placeholder use case the user mentioned for BOOK-006
- Firestore over env vars — user explicitly wants to flip without redeploy
- Pill hidden when LIVE — matches industry convention (Notion, Linear, GitHub
  all show BETA pills on beta features and nothing on stable ones)
- 60s cache — matches `/api/billing/costs`; trades 60s of staleness for not
  re-hitting Firestore on every page load
