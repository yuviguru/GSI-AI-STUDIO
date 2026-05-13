# Monorepo Split — Kid App + School App

## Context

The role-aware shell (`DASH-001/002/003/004`) tried to serve four audiences (kid, parent, teacher, school admin) from one codebase. It works, but every change risks cross-role regressions, and the kid product and school product are genuinely different things — different users, design languages, deploy cadences, auth models, even marketing.

Decision (locked in with the user, this conversation):

| | Choice |
|---|---|
| Scope | **Full monorepo split now** — two Next.js apps, shared packages |
| School auth | **Email magic-link primary; phone OTP fallback for teachers only**; school admins email-only |
| Marketing | **Lives in `apps/kid`** — kid acquisition funnel; schools get `schools.gsi.ai/welcome` |
| Domains | Subdomains: `kids.gsi.ai`, `schools.gsi.ai` |

## End state

```
gsi-ai-studio/                              ← workspace root
├── apps/
│   ├── kid/                                ← :3000, kids.gsi.ai
│   │   ├── app/
│   │   │   ├── (public)/                   ← studios, hub, /help
│   │   │   ├── (marketing)/                ← /welcome — kid funnel
│   │   │   ├── (viewer)/                   ← /view/[id], shared creations
│   │   │   ├── help/
│   │   │   ├── api/                        ← kid-only routes
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/                     ← KidAuthBanner, ExpandableSectionCard,
│   │   │                                       SectionHub, StudioTile, mobile chrome…
│   │   ├── public/
│   │   ├── next.config.js, tailwind.config.ts, tsconfig.json, package.json
│   │
│   └── school/                             ← :3001, schools.gsi.ai
│       ├── app/
│       │   ├── (auth)/(shell)/             ← teacher, school admin, parent
│       │   ├── (auth)/(no-shell)/          ← /login (email magic link)
│       │   ├── (marketing)/                ← /welcome — schools landing
│       │   ├── admin/                      ← /admin/health, /admin/usage
│       │   ├── api/                        ← school-only routes
│       │   ├── layout.tsx
│       │   └── globals.css
│       ├── components/                     ← DashboardShell, all teacher/admin/parent UI
│       ├── public/
│       └── next.config.js, tailwind.config.ts, tsconfig.json, package.json
│
├── packages/
│   ├── types/              @gsi/types       user, kid, dpdp, dashboard, notification…
│   ├── firebase/           @gsi/firebase    admin.ts + every lib/firebase/* service
│   ├── ai/                 @gsi/ai          Claude/Replicate/Gemini clients, eval harness
│   ├── safety/             @gsi/safety      input/output filters, profanity, blocklist
│   ├── dpdp/               @gsi/dpdp        consent + erasure
│   └── ui/                 @gsi/ui          shadcn primitives + tailwind preset + tokens
│
├── docs/, stories/, scripts/                ← unchanged at root
├── pnpm-workspace.yaml                      ← new
├── package.json                             ← workspace root: scripts, devDeps, no app code
└── netlify.toml                             ← multi-site config
```

`apps/*` get their own `next.config.js`, `tailwind.config.ts` (which extends the shared `packages/ui` preset), `tsconfig.json` (extending a root base), and `package.json` (which depends on `@gsi/*` packages).

`packages/*` are workspace packages — no publishing, pnpm symlinks them at install time. Each has its own `package.json`, `tsconfig.json` (typescript composite project), and an `index.ts` entry point.

## Both apps share a backend

Same Firebase project. Same `users` / `kids` / `schools` / `commsLog` collections. A parent's auth token works on `kids.gsi.ai` (their natural home); a teacher's token works on `schools.gsi.ai`. The split is **UI-only** — the data graph is unified, and `@gsi/firebase` is the bridge.

## Auth model after the split

| Portal | Audience | Sign-in method |
|---|---|---|
| `kids.gsi.ai` | Anonymous kids | No login (default open-beta) |
| `kids.gsi.ai` | Parents | **Phone OTP** (unchanged) |
| `schools.gsi.ai` | Teachers | **Email magic link primary**, phone OTP fallback |
| `schools.gsi.ai` | School admins | **Email magic link only** |

Existing phone-based teachers continue to work post-migration (their UID is stable). On first email login, they can optionally link an email to their existing UID. New teachers go email-first.

Firebase Auth supports email-link + phone in the same project; we enable both providers and route per-portal.

## Migration phases

**Phase 1 — Workspace skeleton.** Create `pnpm-workspace.yaml`, `apps/`, `packages/` directories, root tsconfig, root package.json. Nothing moves yet — just structure.

**Phase 2 — Package extraction.** Move `types/`, `lib/firebase/`, `lib/ai/`, `lib/safety/`, `lib/dpdp/`, `lib/responsive/` into their respective `packages/*/src/`. Each gets a `package.json` declaring its exports. Rewrite all imports across the codebase from `@/types/foo` and `@/lib/firebase/bar` to `@gsi/types` and `@gsi/firebase/bar`. Single mega-commit; typecheck must pass after.

**Phase 3 — Kid app extraction.** Move:
- `app/(public)/`, `app/(marketing)/`, `app/(viewer)/`, `app/help/` → `apps/kid/app/`
- Kid-only API: `app/api/sessions/*`, `app/api/ai/*`, `app/api/assets/*`, `app/api/performances/*`, `app/api/comms/parent-*`, `app/api/whatsapp/webhook/*`
- Kid-relevant components: `components/navigation/`, `components/onboarding/`, `components/profile/`, `components/dashboard/`, `components/layout/Bottom*`, `components/layout/Header*`, `components/marketing/`, `components/learning/`, `components/ceo/`, `components/beat-the-ai/`, `components/skill-arena/`, `components/studios/`, `components/learn/`, `components/shared/`, `components/auth/`
- `hooks/*` and `contexts/*` that the kid app touches (auth, kidProfile, aiPoints, etc.)
- `lib/dashboard/configs/kid.config.ts`

The kid app gets its own `next.config.js` and `package.json` depending on `@gsi/{types,firebase,ai,safety,dpdp,ui}`. `apps/kid/app/layout.tsx` becomes the root layout.

**Phase 4 — School app extraction.** Move the rest:
- `app/(auth)/`, `app/admin/` → `apps/school/app/`
- School-only API: `app/api/auth/teacher`, `app/api/schools/*`, `app/api/assignments/*`, `app/api/comms/*` (except parent-*), `app/api/hpc/*`, `app/api/lessons/*`, `app/api/papers/*`, `app/api/substitutes/*`, `app/api/notifications/*`, `app/api/admin/*`, `app/api/mcp/*`
- School components: `components/admin/`, `components/teacher/`, `components/parent/`, `components/class/`, `components/student/`, `components/navigation/Dashboard*` (the generic shell)
- Their own next.config + tailwind + package.json

A new `apps/school/app/(marketing)/welcome/page.tsx` is the `schools.gsi.ai/welcome` landing.

**Phase 5 — School auth: email magic link.**
- Enable email link + phone in Firebase Auth (already supports both — no config change required at the Firebase level; the providers are gated client-side).
- New component `components/auth/EmailMagicLinkFlow.tsx` (in `apps/school`): email input → send-link → return-handler.
- New API routes: `POST /api/auth/email/send` (calls `sendSignInLinkToEmail` server-side via Firebase Admin), `GET /api/auth/email/callback` (handles the magic-link return, signs the user in, redirects to the school dashboard).
- Update `components/teacher/TeacherSignupFlow.tsx` to email-primary + "Use phone instead" fallback link.
- `users/{uid}` schema unchanged — same `phone?`, `email?` optional fields; whichever the user signed in with is set.
- Existing phone-based teachers keep their UID. Add a one-time "Link email to your account" CTA on the teacher dashboard for them.

**Phase 6 — Build / CI / Deploy.**
- `netlify.toml` becomes a top-level orchestrator. Two Netlify sites, both pointing at this repo, with `base = "apps/kid"` and `base = "apps/school"` respectively.
- Each app gets its own `_redirects`, `public/manifest.json`, and PWA config.
- Root `package.json` exposes:
  - `pnpm dev:kid` → `pnpm --filter @gsi/app-kid dev`
  - `pnpm dev:school` → `pnpm --filter @gsi/app-school dev`
  - `pnpm dev:full` → both in parallel via `concurrently`
  - `pnpm build` builds all packages then both apps (in CI)
  - `pnpm test` runs vitest across the whole workspace
- Vitest config moves to root + extends per-package; tests stay co-located with code.

**Phase 7 — Verification.** Both apps independently:
- `pnpm typecheck` → 0 errors
- `pnpm lint` → 0 errors
- `pnpm test --run` → 814+ passing (some tests may move with their code)
- `pnpm build` → both apps build cleanly
- Manual sweep: open `:3000` (kid) and `:3001` (school) in parallel, smoke-test every journey from `docs/test-journeys.md`.

## Things that stay where they are

- `docs/`, `stories/`, `graphify-out/`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `firebase-storage-cors.json` — at the workspace root.
- `scripts/seed-test-data.ts` — at workspace root; the seeder works against the shared Firebase backend regardless of which UI app is running.
- `netlify/functions/*` — at root; both apps can register functions here.

## Things that move at the very end (or are explicitly deferred)

- A possible third app `apps/marketing` if the marketing site outgrows `apps/kid/(marketing)/`. Not now.
- DNS/Netlify domain wiring (`kids.gsi.ai`, `schools.gsi.ai`) — code lands first, DNS as a release step.
- Test re-organization. Keep tests co-located with their code during the move; reshuffle later if needed.

## Risk register

| Risk | Mitigation |
|---|---|
| Phase 2 breaks every import in the repo | Single atomic commit + grep-rewrite. Typecheck verifies before push. |
| PWA service worker caches old shell after deploy | Bump SW version + force-skip-waiting on both apps in Phase 6. |
| Existing teachers locked out after email migration | Keep phone OTP path live; their UID stays stable; offer "link email" not "replace login". |
| Two Netlify sites means two builds = slower CI | Pin per-app build caches; apps build in parallel in CI. |
| Subdomain cookies don't carry across `kids.gsi.ai` ↔ `schools.gsi.ai` | Intentional — different cookie scopes are part of the isolation. Parents sign in once on the kid side. |

## Execution order (PR #62 will get multiple commits)

1. ✅ This plan (commit N)
2. Phase 1 workspace skeleton (commit N+1, ~1 hour)
3. Phase 2 package extraction (commit N+2, ~3 hours, biggest single commit)
4. Phase 3 kid app extraction (commit N+3, ~3 hours)
5. Phase 4 school app extraction (commit N+4, ~3 hours)
6. Phase 5 email magic link auth (commit N+5, ~4 hours)
7. Phase 6 build/CI/Netlify (commit N+6, ~2 hours)
8. Phase 7 final verification (commit N+7)

Each phase commits to a green typecheck/lint/test/build state before the next starts. If any phase blocks, the branch remains usable at the previous checkpoint.
